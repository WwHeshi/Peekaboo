import React, {useMemo, useState} from 'react';
import {Box, Text, useApp} from 'ink';
import {createOpenAIClient} from './ai/client.js';
import {handleCommand} from './commands/handleCommand.js';
import {CommandInput} from './components/CommandInput.js';
import {ChatLog} from './components/ChatLog.js';
import {PetFace} from './components/PetFace.js';
import {StatusBar} from './components/StatusBar.js';
import {loadConfig} from './config/loadConfig.js';
import type {AppState} from './types.js';

const initialState: AppState = {
  mood: 'idle',
  status: '输入 chat 你好 或 observe',
  messages: [
    {
      role: 'pet',
      text: '我在这里。输入 observe 我就看看桌面；只有你主动输入时我才会截图。'
    }
  ]
};

export function App() {
  const {exit} = useApp();
  const config = useMemo(() => loadConfig(), []);
  const client = useMemo(() => createOpenAIClient(config), [config]);
  const [state, setState] = useState<AppState>(initialState);
  const [busy, setBusy] = useState(false);

  const latestPetMessage = [...state.messages].reverse().find(message => message.role === 'pet')?.text ?? '';

  async function submit(input: string) {
    setBusy(true);

    const optimisticState =
      input.trim() === 'observe'
        ? {...state, mood: 'thinking' as const, status: '正在截图并观察桌面'}
        : {...state, status: '处理中'};
    setState(optimisticState);

    try {
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
      setState({
        ...state,
        mood: 'sad',
        status: '出错了',
        messages: [
          ...state.messages,
          {
            role: 'pet' as const,
            text: error instanceof Error ? error.message : '遇到了未知错误。'
          }
        ].slice(-12)
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box flexDirection="column" gap={1}>
      <StatusBar petName={config.petName} mood={state.mood} status={state.status} screenSummary={state.screenSummary} />
      {!config.apiKey ? <Text color="yellow">未检测到 OPENAI_API_KEY：chat 可本地回声，observe 只会截图不理解。</Text> : null}
      <PetFace mood={state.mood} message={latestPetMessage} />
      <ChatLog messages={state.messages} />
      <Text color="gray">Commands: observe | chat 你好 | mood happy | clear | quit</Text>
      <CommandInput disabled={busy} onSubmit={submit} />
    </Box>
  );
}
