import React from 'react';
import {Box, Text} from 'ink';
import {moodEyes} from '../emotion/moods.js';
import type {Mood} from '../types.js';

export function PetFace({mood, message}: {mood: Mood; message: string}) {
  const [left, right] = moodEyes[mood];
  const style = styleForMood(mood);

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
        <Text color="gray">Peekaboo says</Text>
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
