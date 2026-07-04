import React from 'react';
import {Box, Text} from 'ink';
import type {ChatMessage} from '../types.js';

export function ChatLog({messages}: {messages: ChatMessage[]}) {
  const recent = messages.slice(-7);

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1} minHeight={8}>
      <Text color="gray">Recent</Text>
      {recent.length === 0 ? (
        <Text color="gray">还没有聊天。试试 chat 你好 或 observe。</Text>
      ) : (
        recent.map((message, index) => (
          <Text key={`${message.role}-${index}`} color={colorForRole(message.role)}>
            {message.role}: {message.text}
          </Text>
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
