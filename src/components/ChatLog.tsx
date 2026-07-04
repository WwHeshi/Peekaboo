import React from 'react';
import {Box, Text} from 'ink';
import type {ChatMessage} from '../types.js';

export function ChatLog({messages}: {messages: ChatMessage[]}) {
  const recent = messages.slice(-7);

  return (
    <Box flexDirection="column" width="100%" borderStyle="single" borderColor="gray" paddingX={1} minHeight={9}>
      <Box justifyContent="space-between">
        <Text color="gray">Conversation</Text>
        <Text color="gray">{recent.length}/7</Text>
      </Box>
      {recent.length === 0 ? (
        <Box marginTop={1}>
          <Text color="gray">还没有聊天。直接输入一句话试试。</Text>
        </Box>
      ) : (
        recent.map((message, index) => (
          <Box key={`${message.role}-${index}`} marginTop={index === 0 ? 1 : 0}>
            <Box width={10}>
              <Text color={colorForRole(message.role)}>{labelForRole(message.role)}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text color={colorForRole(message.role)} wrap="wrap">
                {message.text}
              </Text>
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}

function colorForRole(role: ChatMessage['role']) {
  if (role === 'you') {
    return 'green';
  }

  if (role === 'system') {
    return 'gray';
  }

  return 'cyan';
}

function labelForRole(role: ChatMessage['role']) {
  if (role === 'you') {
    return 'YOU   │';
  }

  if (role === 'system') {
    return 'LOG   │';
  }

  return 'PET   │';
}
