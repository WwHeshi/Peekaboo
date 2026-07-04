import React from 'react';
import {Box, Text} from 'ink';
import {moodEyes} from '../emotion/moods.js';
import type {Mood} from '../types.js';

export function PetFace({mood, message}: {mood: Mood; message: string}) {
  const [left, right] = moodEyes[mood];

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text color="cyan">        {left}           {right}</Text>
      <Box marginTop={1} width={58}>
        <Text>{message}</Text>
      </Box>
    </Box>
  );
}
