import React from 'react';
import {Box, Text} from 'ink';
import type {Mood, ScreenSummary} from '../types.js';

export function StatusBar(props: {
  petName: string;
  mood: Mood;
  status: string;
  screenSummary?: ScreenSummary;
  hasApiKey: boolean;
  model: string;
}) {
  return (
    <Box flexDirection="column" width="100%" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box justifyContent="space-between">
        <Text>
          <Text color="cyan" bold>{props.petName}</Text>
          <Text color="gray"> / terminal desktop pet</Text>
        </Text>
        <Text>
          <Text color={props.hasApiKey ? 'green' : 'yellow'}>{props.hasApiKey ? 'vision ready' : 'local mode'}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">mood </Text>
        <Text color="magenta">{props.mood}</Text>
        <Text color="gray">   status </Text>
        <Text color="green">{props.status}</Text>
        <Text color="gray">   model </Text>
        <Text color="cyan">{props.model}</Text>
      </Box>
      {props.screenSummary ? (
        <Text color="gray" wrap="wrap">
          screen: {props.screenSummary.summary} ({props.screenSummary.confidence})
        </Text>
      ) : (
        <Text color="gray">screen: agent 可在当前回合需要时调用 observe_screen。</Text>
      )}
    </Box>
  );
}
