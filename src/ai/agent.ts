import type OpenAI from 'openai';
import {z} from 'zod';
import type {AppConfig, ChatMessage, PetReply, ScreenSummary} from '../types.js';

const replySchema = z.object({
  text: z.string().min(1),
  mood: z.enum(['idle', 'smile', 'happy', 'curious', 'thinking', 'surprised', 'sleepy', 'sad'])
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
          '你是一个终端里的桌面宠物，只用简短中文陪伴用户。不要装作你能自动监控桌面；只有用户触发 observe 时你才看到了桌面摘要。输出 JSON：{"text":"...","mood":"idle|smile|happy|curious|thinking|surprised|sleepy|sad"}。回应最多两句话。'
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
