import React from 'react';
import {Box, Text} from 'ink';
import {moodEyes} from '../emotion/moods.js';
import type {Mood, ScreenSummary} from '../types.js';

export function PetFace(props: {
  petName: string;
  mood: Mood;
  message: string;
  status: string;
  screenSummary?: ScreenSummary;
  hasApiKey: boolean;
  model: string;
}) {
  const {petName, mood, message, status, screenSummary, hasApiKey, model} = props;
  const [left, right] = moodEyes[mood];
  const style = styleForMood(mood);
  const modeLabel = hasApiKey ? 'vision ready' : 'local mode';

  return (
    <Box width="100%" borderStyle="round" borderColor={style.color} paddingX={2} paddingY={1}>
      <Box width={24} flexDirection="column" alignItems="center">
        <Text color={style.color}>╭──────────────╮</Text>
        <Text color={style.color}>
          │    <Text color="white" bold>{left}</Text>      <Text color="white" bold>{right}</Text>    │
        </Text>
        <Text color={style.color}>│      {style.mouth}       │</Text>
        <Text color={style.color}>╰──────────────╯</Text>
        <Text color="gray">{style.label}</Text>
      </Box>
      <Box flexDirection="column" flexGrow={1} marginLeft={2}>
        <Box justifyContent="space-between">
          <Text>
            <Text color={style.color} bold>{petName}</Text>
            <Text color="gray"> / terminal desktop pet</Text>
          </Text>
          <Text color={hasApiKey ? 'green' : 'yellow'}>{modeLabel}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">status </Text>
          <Text color="green">{status}</Text>
          <Text color="gray">   model </Text>
          <Text color="cyan">{model}</Text>
        </Box>
        <Text color="gray" wrap="wrap">
          screen: {screenSummary ? `${screenSummary.summary} (${screenSummary.confidence})` : 'agent 可在当前回合需要时调用 observe_screen。'}
        </Text>
        <Box marginTop={1}>
          <Text color="white" wrap="wrap">{message}</Text>
        </Box>
      </Box>
    </Box>
  );
}

function styleForMood(mood: Mood): {color: string; label: string; mouth: string} {
  switch (mood) {
    case 'happy':
      return {color: 'green', label: 'happy', mouth: 'u'};
    case 'smile':
      return {color: 'green', label: 'smiling', mouth: 'u'};
    case 'curious':
      return {color: 'cyan', label: 'curious', mouth: '?'};
    case 'thinking':
      return {color: 'magenta', label: 'thinking', mouth: '-'};
    case 'surprised':
      return {color: 'yellow', label: 'surprised', mouth: 'o'};
    case 'sleepy':
      return {color: 'blue', label: 'sleepy', mouth: '-'};
    case 'sad':
      return {color: 'red', label: 'quiet', mouth: 'n'};
    case 'idle':
      return {color: 'cyan', label: 'idle', mouth: 'w'};
  }
}
