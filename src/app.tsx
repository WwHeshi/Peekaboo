import React, {useMemo, useState} from 'react';
import {Box, Text, useApp, useStdout} from 'ink';
import {runPetAgentTurnStream} from './ai/agent.js';
import {createOpenAIClient} from './ai/client.js';
import {handleCommand} from './commands/handleCommand.js';
import {CommandInput} from './components/CommandInput.js';
import {ChatLog} from './components/ChatLog.js';
import {PetFace} from './components/PetFace.js';
import {StatusBar} from './components/StatusBar.js';
import {loadConfig} from './config/loadConfig.js';
import {captureFullDesktop} from './perception/screenshot.js';
import type {AppState, ChatMessage} from './types.js';

const initialState: AppState = {
  mood: 'idle',
  status: '直接输入聊天内容',
  messages: [
    {
      role: 'pet',
      text: '我在这里。你直接和我说话就行；如果需要看屏幕，我会在当前回合里调用截图工具。'
    }
  ]
};

export function App() {
  const {exit} = useApp();
  const {stdout} = useStdout();
  const config = useMemo(() => loadConfig(), []);
  const client = useMemo(() => createOpenAIClient(config), [config]);
  const [state, setState] = useState<AppState>(initialState);
  const [busy, setBusy] = useState(false);
  const terminalWidth = stdout.columns ?? 86;
  const width = Math.min(92, Math.max(62, terminalWidth - 2));

  const latestPetMessage = [...state.messages].reverse().find(message => message.role === 'pet')?.text ?? '';

  async function submit(input: string) {
    const raw = input.trim();
    setBusy(true);

    try {
      if (await handleStreamingCommand(raw)) {
        return;
      }

      setState({...state, status: raw ? '处理中' : state.status});
      const nextState = await handleCommand({
        input,
        state,
        config,
        client
      });

      setState(nextState);
      if (nextState.shouldExit) {
        exit();
      }
    } catch (error) {
      setState(current => ({
        ...current,
        mood: 'sad',
        status: '出错了',
        messages: [
          ...current.messages,
          {
            role: 'pet' as const,
            text: error instanceof Error ? error.message : '遇到了未知错误。'
          }
        ].slice(-12)
      }));
    } finally {
      setBusy(false);
    }
  }

  async function handleStreamingCommand(raw: string): Promise<boolean> {
    if (!raw) {
      return false;
    }

    const [command, ...rest] = raw.split(' ');
    const argument = rest.join(' ').trim();

    if (command === 'chat' && !argument) {
      return false;
    }

    if (command === 'chat' || !['quit', 'exit', 'clear', 'mood'].includes(command)) {
      await streamChat(command === 'chat' ? argument : raw);
      return true;
    }

    return false;
  }

  async function streamChat(userText: string) {
    let usedObserveTool = false;
    const startMessages = appendMessages(state.messages, {role: 'you', text: userText}, {role: 'pet', text: ''});
    setState({
      ...state,
      mood: 'thinking',
      status: 'agent 正在思考',
      messages: startMessages
    });

    let streamedText = '';
    const reply = await runPetAgentTurnStream({
      client,
      config,
      messages: state.messages,
      userText,
      screenSummary: state.screenSummary,
      observeScreen: captureFullDesktop,
      onToolUse() {
        usedObserveTool = true;
        setState(current => ({
          ...current,
          mood: 'thinking',
          status: '正在使用 observe_screen 截图',
          screenSummary: {
            summary: '本轮已通过 observe_screen 工具观察桌面。',
            confidence: 'high'
          }
        }));
      },
      onDelta(delta) {
        streamedText += delta;
        setState(current => ({
          ...current,
          mood: 'thinking',
          status: usedObserveTool ? '正在根据屏幕回应' : '正在回应',
          messages: replaceLastPetMessage(current.messages, streamedText)
        }));
      }
    });

    setState(current => ({
      ...current,
      mood: reply.mood,
      status: '已回应',
      screenSummary: usedObserveTool
        ? {
            summary: '本轮已通过 observe_screen 工具观察桌面。',
            confidence: 'high'
          }
        : current.screenSummary,
      messages: replaceLastPetMessage(current.messages, reply.text)
    }));
  }

  return (
    <Box flexDirection="column" width={width} gap={1}>
      <StatusBar
        petName={config.petName}
        mood={state.mood}
        status={state.status}
        screenSummary={state.screenSummary}
        hasApiKey={Boolean(config.apiKey)}
        model={config.model}
      />
      {!config.apiKey ? (
        <Box paddingX={1}>
          <Text color="yellow">未检测到 OPENAI_API_KEY：chat 可本地回声，屏幕工具只会截图不理解。</Text>
        </Box>
      ) : null}
      <PetFace mood={state.mood} message={latestPetMessage} />
      <ChatLog messages={state.messages} />
      <CommandInput disabled={busy} onSubmit={submit} />
    </Box>
  );
}

function appendMessages(messages: ChatMessage[], ...nextMessages: ChatMessage[]): ChatMessage[] {
  return [...messages, ...nextMessages];
}

function replaceLastPetMessage(messages: ChatMessage[], text: string): ChatMessage[] {
  const nextMessages = [...messages];
  for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
    if (nextMessages[index]?.role === 'pet') {
      nextMessages[index] = {role: 'pet', text};
      return nextMessages;
    }
  }

  return appendMessages(nextMessages, {role: 'pet', text});
}
