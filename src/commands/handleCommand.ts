import type OpenAI from 'openai';
import {generateChatReply} from '../ai/agent.js';
import {isMood} from '../emotion/moods.js';
import type {AppConfig, AppState, ChatMessage} from '../types.js';

export async function handleCommand(options: {
  input: string;
  state: AppState;
  config: AppConfig;
  client?: OpenAI;
}): Promise<AppState & {shouldExit?: boolean}> {
  const raw = options.input.trim();
  const state = options.state;

  if (!raw) {
    return state;
  }

  const [command, ...rest] = raw.split(' ');
  const argument = rest.join(' ').trim();

  if (command === 'quit' || command === 'exit') {
    return {
      ...state,
      status: 'bye',
      shouldExit: true
    };
  }

  if (command === 'clear') {
    return {
      mood: 'idle',
      status: '聊天记录已清空',
      messages: [],
      screenSummary: undefined
    };
  }

  if (command === 'mood') {
    if (isMood(argument)) {
      return {
        ...state,
        mood: argument,
        status: `情绪切换为 ${argument}`
      };
    }

    return appendPet(state, `我还没有这个表情：${argument || '(空)'}`, 'thinking', '可用情绪：idle smile happy curious thinking surprised sleepy sad');
  }

  const userText = command === 'chat' ? argument : raw;
  if (!userText) {
    return appendPet(state, '你想和我聊什么？', 'curious', '等待输入');
  }

  const reply = await generateChatReply({
    client: options.client,
    config: options.config,
    messages: state.messages,
    userText,
    screenSummary: state.screenSummary
  });

  return {
    ...state,
    mood: reply.mood,
    status: '已回应',
    messages: [
      ...state.messages,
      {role: 'you' as const, text: userText},
      {role: 'pet' as const, text: reply.text}
    ].slice(-12)
  };
}

function appendPet(state: AppState, text: string, mood: AppState['mood'], status: string): AppState {
  const message: ChatMessage = {role: 'pet', text};

  return {
    ...state,
    mood,
    status,
    messages: [...state.messages, message].slice(-12)
  };
}
