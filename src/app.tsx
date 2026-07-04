import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, useStdout} from 'ink';
import {runPetAgentTurnStream} from './ai/agent.js';
import {createOpenAIClient} from './ai/client.js';
import {CommandInput} from './components/CommandInput.js';
import {PetFace} from './components/PetFace.js';
import {loadConfig} from './config/loadConfig.js';
import {captureFullDesktop} from './perception/screenshot.js';
import type {AppState, ChatMessage, Mood} from './types.js';

const initialState: AppState = {
  mood: 'idle',
  status: '待机',
  messages: [
    {
      role: 'pet',
      text: '我在这里。你直接和我说话就行；如果需要看屏幕，我会在当前回合里调用截图工具。'
    }
  ]
};

export function App() {
  const {stdout} = useStdout();
  const config = useMemo(() => loadConfig(), []);
  const client = useMemo(() => createOpenAIClient(config), [config]);
  const [state, setState] = useState<AppState>(initialState);
  const [busy, setBusy] = useState(false);
  const moodTimers = useRef<NodeJS.Timeout[]>([]);
  const terminalWidth = stdout.columns ?? 86;
  const width = Math.min(92, Math.max(62, terminalWidth - 2));

  const latestPetMessage = [...state.messages].reverse().find(message => message.role === 'pet')?.text ?? '';

  useEffect(() => () => {
    for (const timer of moodTimers.current) {
      clearTimeout(timer);
    }

    moodTimers.current = [];
  }, []);

  async function submit(input: string) {
    const raw = input.trim();
    setBusy(true);

    try {
      if (!raw) {
        return;
      }

      await streamChat(raw);
    } catch (error) {
      setState(current => ({
        ...current,
        mood: 'sad',
        status: '出错',
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

  async function streamChat(userText: string) {
    let usedObserveTool = false;
    let scheduledMoodChange = false;
    const startMessages = appendMessages(state.messages, {role: 'you', text: userText}, {role: 'pet', text: ''});
    setState({
      ...state,
      status: '思考中',
      messages: startMessages
    });

    let streamedText = '';
    const reply = await runPetAgentTurnStream({
      client,
      config,
      messages: state.messages,
      userText,
      currentMood: state.mood,
      observeScreen: captureFullDesktop,
      onToolUse() {
        usedObserveTool = true;
        setState(current => ({
          ...current,
          status: '观察屏幕中',
          screenSummary: {
            summary: '本轮已通过 observe_screen 工具观察桌面。',
            confidence: 'high'
          }
        }));
      },
      onMoodChange(mood, options) {
        const delayMs = Math.round(options?.delayMs ?? 0);
        if (delayMs > 0) {
          scheduledMoodChange = true;
          scheduleMoodChange(mood, delayMs);
          return;
        }

        applyMoodChange(mood);
      },
      onDelta(delta) {
        streamedText += delta;
        setState(current => ({
          ...current,
          status: usedObserveTool ? '根据屏幕回应中' : '回应中',
          messages: replaceLastPetMessage(current.messages, streamedText)
        }));
      }
    });

    setState(current => ({
      ...current,
      mood: scheduledMoodChange ? current.mood : reply.mood,
      status: '待机',
      screenSummary: usedObserveTool
        ? {
            summary: '本轮已通过 observe_screen 工具观察桌面。',
            confidence: 'high'
          }
        : current.screenSummary,
      messages: replaceLastPetMessage(current.messages, reply.text)
    }));
  }

  function applyMoodChange(mood: Mood) {
    setState(current => ({
      ...current,
      mood
    }));
  }

  function scheduleMoodChange(mood: Mood, delayMs: number) {
    const timer = setTimeout(() => {
      applyMoodChange(mood);
      moodTimers.current = moodTimers.current.filter(currentTimer => currentTimer !== timer);
    }, delayMs);

    moodTimers.current.push(timer);
  }

  return (
    <Box flexDirection="column" width={width} gap={1}>
      {!config.apiKey ? (
        <Box paddingX={1}>
          <Text color="yellow">未检测到 OPENAI_API_KEY：当前为本地回声，屏幕工具只会截图不理解。</Text>
        </Box>
      ) : null}
      <PetFace
        petName={config.petName}
        mood={state.mood}
        message={latestPetMessage}
        status={state.status}
        model={config.model}
      />
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
