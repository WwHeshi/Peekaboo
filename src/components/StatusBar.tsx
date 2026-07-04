import React from 'react';
import {Box, Text} from 'ink';
import type {Mood, ScreenSummary} from '../types.js';

export function StatusBar(props: {
  petName: string;
  mood: Mood;
  status: string;
  screenSummary?: ScreenSummary;
}) {
  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text>
        {props.petName} | Mood: {props.mood} | Status: {props.status}
      </Text>
      {props.screenSummary ? (
        <Text color="gray">
          Screen: {props.screenSummary.summary} ({props.screenSummary.confidence})
        </Text>
      ) : (
        <Text color="gray">Screen: 未观察。输入 observe 后才会截图。</Text>
      )}
    </Box>
  );
}
