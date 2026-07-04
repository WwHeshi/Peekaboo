import React from 'react';
import {Box, Text} from 'ink';
import {moodEyes} from '../emotion/moods.js';
import type {Mood} from '../types.js';

export function PetFace(props: {
  petName: string;
  mood: Mood;
  message: string;
  status: string;
  model: string;
}) {
  const {petName, mood, message, status, model} = props;
  const eyes = moodEyes[mood];

  return (
    <Box width="100%" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1}>
      <Box flexDirection="column" flexShrink={0}>
        {eyes.map((line, lineIndex) => (
          <Text key={`${mood}-${lineIndex}`}>
            {Array.from(line).map((char, charIndex) => (
              <Text
                key={`${mood}-${lineIndex}-${charIndex}`}
                color={pixelColor(char)}
                bold={char === '█' || char === '▓'}
              >
                {char}
              </Text>
            ))}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" flexGrow={1} marginLeft={1}>
        <Text color="cyan" bold>{petName}</Text>
        <Box marginTop={1}>
          <Text color="gray">status </Text>
          <Text color="green">{status}</Text>
          <Text color="gray">   mood </Text>
          <Text color="gray">{mood}</Text>
          <Text color="gray">   model </Text>
          <Text color="cyan">{model}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="white" wrap="wrap">{message}</Text>
        </Box>
      </Box>
    </Box>
  );
}

function pixelColor(char: string): string {
  if (char === '█') {
    return 'cyan';
  }

  if (char === '▓') {
    return 'white';
  }

  if (char === '░') {
    return 'gray';
  }

  if ('✦?·z╲╱'.includes(char)) {
    return 'yellow';
  }

  return 'cyan';
}
