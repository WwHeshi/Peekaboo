import type OpenAI from 'openai';
import {z} from 'zod';
import type {AppConfig, ChatMessage, Mood, PetReply, ScreenSummary} from '../types.js';

const moodSchema = z.enum(['idle', 'smile', 'happy', 'curious', 'thinking', 'surprised', 'sleepy', 'sad']);
const delaySecondsSchema = z.preprocess(value => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    return Number.parseFloat(value);
  }

  return value;
}, z.number().min(0).max(3600).optional());

const setMoodArgumentsSchema = z.object({
  mood: moodSchema,
  delay_seconds: delaySecondsSchema,
  delaySeconds: delaySecondsSchema
});

const replySchema = z.object({
  text: z.string().min(1),
  mood: moodSchema
});

export async function generateChatReply(options: {
  client?: OpenAI;
  config: AppConfig;
  messages: ChatMessage[];
  userText: string;
  screenSummary?: ScreenSummary;
}): Promise<PetReply> {
  const {client, config, messages, userText, screenSummary} = options;

  if (!client) {
    return {
      text: `我听到了：“${userText}”。配置 OPENAI_API_KEY 后，我就能更自然地回应你。`,
      mood: 'smile'
    };
  }

  const recent = messages
    .slice(-8)
    .map(message => `${message.role}: ${message.text}`)
    .join('\n');

  const completion = await client.chat.completions.create({
    model: config.model,
    response_format: {type: 'json_object'},
    messages: [
      {
        role: 'system',
        content:
          '你是一个终端里的桌面宠物，只用简短中文陪伴用户。不要装作你能自动监控桌面；只有当前回合通过 observe_screen 工具时你才看到了屏幕。输出 JSON：{"text":"...","mood":"idle|smile|happy|curious|thinking|surprised|sleepy|sad"}。回应最多两句话。'
      },
      {
        role: 'user',
        content: [
          `宠物名字：${config.petName}`,
          screenSummary ? `最近桌面摘要：${screenSummary.summary}` : '最近桌面摘要：无',
          recent ? `最近对话：\n${recent}` : '最近对话：无',
          `用户刚说：${userText}`
        ].join('\n\n')
      }
    ]
  });

  return parseReply(completion.choices[0]?.message.content);
}

export async function generateObservationReply(options: {
  client?: OpenAI;
  config: AppConfig;
  summary: ScreenSummary;
  messages: ChatMessage[];
}): Promise<PetReply> {
  const {client, config, summary, messages} = options;

  if (!client) {
    return {
      text: `我看到了一些画面，但还不能认真理解：${summary.summary}`,
      mood: 'curious'
    };
  }

  const recent = messages
    .slice(-6)
    .map(message => `${message.role}: ${message.text}`)
    .join('\n');

  const completion = await client.chat.completions.create({
    model: config.model,
    response_format: {type: 'json_object'},
    messages: [
      {
        role: 'system',
        content:
          '你是一个终端里的桌面宠物。根据用户主动触发的桌面截图摘要，给出一句陪伴式回应。不要逐字复述隐私内容，不要显得在持续监控用户。输出 JSON：{"text":"...","mood":"idle|smile|happy|curious|thinking|surprised|sleepy|sad"}。'
      },
      {
        role: 'user',
        content: [
          `宠物名字：${config.petName}`,
          `桌面摘要：${summary.summary}`,
          `置信度：${summary.confidence}`,
          recent ? `最近对话：\n${recent}` : '最近对话：无'
        ].join('\n\n')
      }
    ]
  });

  return parseReply(completion.choices[0]?.message.content);
}

export async function runPetAgentTurnStream(options: {
  client?: OpenAI;
  config: AppConfig;
  messages: ChatMessage[];
  userText: string;
  currentMood: Mood;
  observeScreen?: () => Promise<Buffer>;
  onToolUse?: (toolName: 'observe_screen') => void;
  onMoodChange?: (mood: Mood, options?: {delayMs?: number}) => void;
  onDelta?: (delta: string) => void;
}): Promise<PetReply> {
  const {client, config, messages, userText, currentMood: initialMood, observeScreen, onToolUse, onMoodChange, onDelta} = options;

  if (!client) {
    const reply = {
      text: `我听到了：“${userText}”。配置 OPENAI_API_KEY 后，我就能更自然地回应你。`,
      mood: initialMood
    };
    await emitSyntheticStream(reply.text, onDelta);
    return reply;
  }

  const agentMessages = buildAgentMessages({
    config,
    messages,
    userText
  });
  let usedObserveScreen = false;
  let currentMood = initialMood;
  let selectedMood: Mood | undefined;
  let visibleText = '';

  for (let step = 1; step <= 4; step += 1) {
    const allowObserveScreen = Boolean(observeScreen) && !usedObserveScreen;

    try {
      const result = await runAgentStep({
        client,
        config,
        messages: agentMessages,
        allowObserveScreen,
        onDelta(delta) {
          visibleText += delta;
          onDelta?.(delta);
        }
      });

      if (result.toolCalls.length === 0) {
        const finalText = result.text.trim() || '我刚刚有点走神了，再说一次好吗？';
        if (!result.text.trim()) {
          visibleText += finalText;
          onDelta?.(finalText);
        }

        return {
          text: visibleText.trim() || finalText,
          mood: selectedMood ?? currentMood
        };
      }

      agentMessages.push({
        role: 'assistant',
        content: result.text || null,
        tool_calls: result.toolCalls
      });

      for (const toolCall of result.toolCalls) {
        if (toolCall.function.name === 'set_mood') {
          const moodChange = parseSetMood(toolCall.function.arguments);
          if (moodChange) {
            const {mood, delaySeconds} = moodChange;
            if (delaySeconds > 0) {
              onMoodChange?.(mood, {delayMs: delaySeconds * 1000});
              agentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `已安排 ${formatDelaySeconds(delaySeconds)} 后切换为 ${mood}。当前情绪仍是 ${currentMood}。`
              });
              continue;
            }

            currentMood = mood;
            selectedMood = mood;
            onMoodChange?.(mood);
            agentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `情绪已切换为 ${mood}。`
            });
          } else {
            agentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: 'set_mood 参数无效，请使用 idle、smile、happy、curious、thinking、surprised、sleepy、sad 之一。'
            });
          }
          continue;
        }

        if (toolCall.function.name === 'get_mood') {
          agentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `当前情绪是 ${currentMood}。`
          });
          continue;
        }

        if (toolCall.function.name !== 'observe_screen' || !observeScreen) {
          agentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `工具 ${toolCall.function.name} 不可用。`
          });
          continue;
        }

        usedObserveScreen = true;
        onToolUse?.('observe_screen');
        const image = await observeScreen();
        agentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: 'observe_screen 已截取当前桌面截图。图片会在下一条上下文消息中提供。'
        });
        agentMessages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'observe_screen 工具结果：这是当前桌面截图。请基于图片回答用户，但不要逐字抄写隐私内容，也不要声称你在后台持续监控。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${image.toString('base64')}`,
                detail: 'low'
              }
            }
          ]
        });
      }
    } catch (error) {
      if (step === 1) {
        return runFallbackAgentTurn({
          client,
          config,
          messages,
          userText,
          currentMood,
          observeScreen,
          onToolUse,
          onDelta
        });
      }

      throw error;
    }
  }

  const fallback = '我试着调用工具看了一下，但这轮对话没有收束好。你可以换个说法再问我一次。';
  onDelta?.(fallback);
  return {text: fallback, mood: selectedMood ?? currentMood};
}

export async function generateChatReplyStream(options: {
  client?: OpenAI;
  config: AppConfig;
  messages: ChatMessage[];
  userText: string;
  currentMood?: Mood;
  screenSummary?: ScreenSummary;
  observeScreen?: () => Promise<Buffer>;
  forceObserve?: boolean;
  onToolUse?: (toolName: 'observe_screen') => void;
  onDelta?: (delta: string) => void;
}): Promise<PetReply> {
  const {client, config, messages, userText, screenSummary, observeScreen, forceObserve = false, onToolUse, onDelta} = options;

  if (!client) {
    if (forceObserve && observeScreen) {
      onToolUse?.('observe_screen');
      await observeScreen();
    }

    const reply = {
      text: forceObserve
        ? '我已经触发了一次截图，但当前没有 OPENAI_API_KEY，所以还不能理解画面内容。'
        : `我听到了：“${userText}”。配置 OPENAI_API_KEY 后，我就能更自然地回应你。`,
      mood: options.currentMood ?? (forceObserve ? 'curious' as const : 'smile' as const)
    };
    await emitSyntheticStream(reply.text, onDelta);
    return reply;
  }

  const recent = messages
    .slice(-8)
    .map(message => `${message.role}: ${message.text}`)
    .join('\n');

  let screenImage: Buffer | undefined;
  if (forceObserve && observeScreen) {
    onToolUse?.('observe_screen');
    screenImage = await observeScreen();
  } else if (observeScreen && await shouldUseObserveTool({client, config, messages, userText, screenSummary})) {
    onToolUse?.('observe_screen');
    screenImage = await observeScreen();
  }

  const userContent = buildUserContent({
    config,
    screenSummary,
    recent,
    userText,
    screenImage
  });

  const stream = await client.chat.completions.create({
    model: config.model,
    stream: true,
    messages: [
      {
        role: 'system',
        content:
          '你是一个终端里的桌面宠物，只用简短中文陪伴用户。你只能在当前这次用户交互中通过 observe_screen 工具看到桌面；不要声称自己在后台持续监控。只输出给用户看的正文，不要 JSON，不要 Markdown。回应最多两句话。'
      },
      {
        role: 'user',
        content: userContent
      }
    ]
  });

  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) {
      continue;
    }

    text += delta;
    onDelta?.(delta);
  }

  const fallback = '我刚刚有点走神了，再说一次好吗？';
  const finalText = text.trim() || fallback;
  if (!text.trim()) {
    onDelta?.(fallback);
  }

  return {
    text: finalText,
    mood: options.currentMood ?? 'smile'
  };
}

export async function generateObservationReplyStream(options: {
  client?: OpenAI;
  config: AppConfig;
  summary: ScreenSummary;
  messages: ChatMessage[];
  currentMood?: Mood;
  onDelta?: (delta: string) => void;
}): Promise<PetReply> {
  const {client, config, summary, messages, onDelta} = options;

  if (!client) {
    const reply = {
      text: `我看到了一些画面，但还不能认真理解：${summary.summary}`,
      mood: options.currentMood ?? 'curious' as const
    };
    await emitSyntheticStream(reply.text, onDelta);
    return reply;
  }

  const recent = messages
    .slice(-6)
    .map(message => `${message.role}: ${message.text}`)
    .join('\n');

  const stream = await client.chat.completions.create({
    model: config.model,
    stream: true,
    messages: [
      {
        role: 'system',
        content:
          '你是一个终端里的桌面宠物。根据用户主动触发的桌面截图摘要，给出一句陪伴式回应。不要逐字复述隐私内容，不要显得在持续监控用户。只输出给用户看的正文，不要 JSON，不要 Markdown。'
      },
      {
        role: 'user',
        content: [
          `宠物名字：${config.petName}`,
          `桌面摘要：${summary.summary}`,
          `置信度：${summary.confidence}`,
          recent ? `最近对话：\n${recent}` : '最近对话：无'
        ].join('\n\n')
      }
    ]
  });

  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) {
      continue;
    }

    text += delta;
    onDelta?.(delta);
  }

  const fallback = '我看到了一些画面，但刚刚没组织好语言。';
  const finalText = text.trim() || fallback;
  if (!text.trim()) {
    onDelta?.(fallback);
  }

  return {
    text: finalText,
    mood: options.currentMood ?? 'curious'
  };
}

function parseReply(content?: string | null): PetReply {
  if (!content) {
    return {text: '我刚刚有点走神了，再说一次好吗？', mood: 'thinking'};
  }

  const json = safeJson(content);
  if (!json) {
    return {text: content.slice(0, 120), mood: 'idle'};
  }

  const parsed = replySchema.safeParse(json);
  if (!parsed.success) {
    return {text: content.slice(0, 120), mood: 'idle'};
  }

  return parsed.data;
}

function safeJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return undefined;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}

function parseSetMood(argumentsText: string): {mood: Mood; delaySeconds: number} | undefined {
  const json = safeJson(argumentsText);
  const parsed = setMoodArgumentsSchema.safeParse(json);
  if (!parsed.success) {
    return undefined;
  }

  return {
    mood: parsed.data.mood,
    delaySeconds: parsed.data.delay_seconds ?? parsed.data.delaySeconds ?? 0
  };
}

function formatDelaySeconds(seconds: number): string {
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} 秒`;
}

async function emitSyntheticStream(text: string, onDelta?: (delta: string) => void): Promise<void> {
  if (!onDelta) {
    return;
  }

  const chars = Array.from(text);
  for (let index = 0; index < chars.length; index += 2) {
    onDelta(chars.slice(index, index + 2).join(''));
    await delay(18);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function shouldUseObserveTool(options: {
  client: OpenAI;
  config: AppConfig;
  messages: ChatMessage[];
  userText: string;
  screenSummary?: ScreenSummary;
}): Promise<boolean> {
  const {client, config, messages, userText, screenSummary} = options;
  const recent = messages
    .slice(-6)
    .map(message => `${message.role}: ${message.text}`)
    .join('\n');

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            '你可以选择是否调用工具 observe_screen。只有当用户的问题需要当前桌面画面、屏幕内容、窗口状态、他们正在做什么、或用户明确要求观察/看看屏幕时，才调用该工具。普通聊天不要调用。'
        },
        {
          role: 'user',
          content: [
            `宠物名字：${config.petName}`,
            screenSummary ? `上次观察状态：${screenSummary.summary}` : '上次观察状态：无',
            recent ? `最近对话：\n${recent}` : '最近对话：无',
            `用户刚说：${userText}`
          ].join('\n\n')
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'observe_screen',
            description: '截取当前完整桌面截图，并把截图作为视觉输入提供给模型。本工具只应在当前用户请求确实需要看屏幕时使用。',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: '简短说明为什么这次需要观察屏幕。'
                }
              },
              required: ['reason'],
              additionalProperties: false
            }
          }
        }
      ],
      tool_choice: 'auto'
    });

    return completion.choices[0]?.message.tool_calls?.some(toolCall => toolCall.type === 'function' && toolCall.function.name === 'observe_screen') ?? false;
  } catch {
    return shouldObserveFromText(userText);
  }
}

function shouldObserveFromText(text: string): boolean {
  return /observe|screen|desktop|screenshot|截图|截屏|屏幕|桌面|看看|看一下|看下|观察|我在做什么|窗口/.test(text);
}

function buildUserContent(options: {
  config: AppConfig;
  screenSummary?: ScreenSummary;
  recent: string;
  userText: string;
  screenImage?: Buffer;
}) {
  const {config, screenSummary, recent, userText, screenImage} = options;
  const text = [
    `宠物名字：${config.petName}`,
    screenSummary ? `上次观察状态：${screenSummary.summary}` : '上次观察状态：无',
    recent ? `最近对话：\n${recent}` : '最近对话：无',
    screenImage ? '工具 observe_screen 已返回当前桌面截图。请基于这张图片回答，但不要逐字抄写隐私内容。' : '本轮没有观察屏幕。',
    `用户刚说：${userText}`
  ].join('\n\n');

  if (!screenImage) {
    return text;
  }

  return [
    {
      type: 'text' as const,
      text
    },
    {
      type: 'image_url' as const,
      image_url: {
        url: `data:image/png;base64,${screenImage.toString('base64')}`,
        detail: 'low' as const
      }
    }
  ];
}

type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type ChatTool = OpenAI.Chat.Completions.ChatCompletionTool;
type ChatToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall;

const observeScreenTool: ChatTool = {
  type: 'function',
  function: {
    name: 'observe_screen',
    description: '截取当前完整桌面截图，并把截图作为视觉输入提供给模型。只有当回答用户问题确实需要当前屏幕画面时才调用。',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: '简短说明为什么这次需要观察屏幕。'
        }
      },
      required: ['reason'],
      additionalProperties: false
    }
  }
};

const setMoodTool: ChatTool = {
  type: 'function',
  function: {
    name: 'set_mood',
    description: '切换桌面宠物当前表情。这个工具只影响界面情绪，不会作为用户可见文字展示。',
    parameters: {
      type: 'object',
      properties: {
        mood: {
          type: 'string',
          enum: ['idle', 'smile', 'happy', 'curious', 'thinking', 'surprised', 'sleepy', 'sad'],
          description: '当前回复最适合的情绪。'
        },
        delay_seconds: {
          type: 'number',
          minimum: 0,
          maximum: 3600,
          description: '可选。延迟多少秒后再切换情绪；省略或 0 表示立刻切换。例如 5 表示 5 秒后切换。'
        },
        reason: {
          type: 'string',
          description: '简短说明为什么选择这个情绪。'
        }
      },
      required: ['mood'],
      additionalProperties: false
    }
  }
};

const getMoodTool: ChatTool = {
  type: 'function',
  function: {
    name: 'get_mood',
    description: '查看桌面宠物当前表情。用于需要基于当前情绪决定下一步回应或是否切换情绪时。',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
};

function buildAgentMessages(options: {
  config: AppConfig;
  messages: ChatMessage[];
  userText: string;
}): ChatMessageParam[] {
  const {config, messages, userText} = options;
  const history = messages.map(messageToModelMessage);

  return [
    {
      role: 'system',
      content: [
        `你是 ${config.petName}，一个住在终端里的桌面宠物。`,
        '你可以像 agent 一样在当前用户回合中调用 observe_screen 工具查看桌面截图。',
        '你也可以调用 set_mood 工具切换自己的表情。set_mood 是内部状态工具，不要把工具名或情绪字段说给用户。',
        'set_mood 支持 delay_seconds，可用于“几秒后再变成某个情绪”这类延迟切换。',
        '你可以调用 get_mood 查看当前表情。',
        '每次回复前，尽量用 set_mood 选择一个贴合当前回答的情绪：idle、smile、happy、curious、thinking、surprised、sleepy、sad。',
        '只有当当前问题需要屏幕画面、窗口状态、用户正在做什么，或用户用自然语言要求你看屏幕时，才调用 observe_screen。',
        '不要声称你在后台持续监控；你只能通过工具在当前回合观察一次。',
        '回复使用简短中文，最多两句话。不要输出 JSON，不要 Markdown。'
      ].join('\n')
    },
    ...history,
    {
      role: 'user',
      content: userText
    }
  ];
}

function messageToModelMessage(message: ChatMessage): ChatMessageParam {
  if (message.role === 'you') {
    return {role: 'user', content: message.text};
  }

  if (message.role === 'system') {
    return {role: 'system', content: message.text};
  }

  return {role: 'assistant', content: message.text};
}

async function runAgentStep(options: {
  client: OpenAI;
  config: AppConfig;
  messages: ChatMessageParam[];
  allowObserveScreen: boolean;
  onDelta?: (delta: string) => void;
}): Promise<{text: string; toolCalls: ChatToolCall[]}> {
  const {client, config, messages, allowObserveScreen, onDelta} = options;
  const tools = allowObserveScreen ? [setMoodTool, getMoodTool, observeScreenTool] : [setMoodTool, getMoodTool];

  const stream = await client.chat.completions.create({
    model: config.model,
    stream: true,
    messages,
    tools,
    tool_choice: 'auto'
  });

  let text = '';
  const toolCallParts = new Map<number, {
    id: string;
    name: string;
    arguments: string;
  }>();

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    const content = delta?.content ?? '';
    if (content) {
      text += content;
      onDelta?.(content);
    }

    for (const toolCallDelta of delta?.tool_calls ?? []) {
      const index = toolCallDelta.index;
      const current = toolCallParts.get(index) ?? {id: '', name: '', arguments: ''};
      toolCallParts.set(index, {
        id: toolCallDelta.id ?? current.id,
        name: toolCallDelta.function?.name ?? current.name,
        arguments: current.arguments + (toolCallDelta.function?.arguments ?? '')
      });
    }
  }

  const toolCalls: ChatToolCall[] = [...toolCallParts.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, toolCall]) => ({
      id: toolCall.id || `observe_screen_${String(index)}`,
      type: 'function' as const,
      function: {
        name: toolCall.name,
        arguments: toolCall.arguments || '{}'
      }
    }))
    .filter(toolCall => toolCall.function.name.length > 0);

  return {text, toolCalls};
}

async function runFallbackAgentTurn(options: {
  client: OpenAI;
  config: AppConfig;
  messages: ChatMessage[];
  userText: string;
  currentMood: Mood;
  observeScreen?: () => Promise<Buffer>;
  onToolUse?: (toolName: 'observe_screen') => void;
  onDelta?: (delta: string) => void;
}): Promise<PetReply> {
  const {client, config, messages, userText, currentMood, observeScreen, onToolUse, onDelta} = options;
  let screenImage: Buffer | undefined;

  if (observeScreen && shouldObserveFromText(userText)) {
    onToolUse?.('observe_screen');
    screenImage = await observeScreen();
  }

  const recent = messages
    .map(message => `${message.role}: ${message.text}`)
    .join('\n');
  const stream = await client.chat.completions.create({
    model: config.model,
    stream: true,
    messages: [
      {
        role: 'system',
        content:
          '你是一个终端里的桌面宠物。回复使用简短中文，最多两句话。不要输出 JSON，不要 Markdown。'
      },
      {
        role: 'user',
        content: buildUserContent({
          config,
          recent,
          userText,
          screenImage
        })
      }
    ]
  });

  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (!delta) {
      continue;
    }

    text += delta;
    onDelta?.(delta);
  }

  const finalText = text.trim() || '我刚刚有点走神了，再说一次好吗？';
  if (!text.trim()) {
    onDelta?.(finalText);
  }

  return {
    text: finalText,
    mood: currentMood
  };
}
