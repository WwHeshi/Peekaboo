import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';

export function CommandInput(props: {
  disabled: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (props.disabled) {
      return;
    }

    if (key.return) {
      props.onSubmit(value);
      setValue('');
      return;
    }

    if (key.backspace || key.delete) {
      setValue(current => current.slice(0, -1));
      return;
    }

    if (key.ctrl && input === 'c') {
      process.exit(0);
      return;
    }

    if (input) {
      setValue(current => `${current}${input}`);
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray" bold>
          &gt;
        </Text>
        <Text color={props.disabled ? 'gray' : value ? 'white' : 'gray'}>
          {' '}
          {props.disabled ? '处理中...' : value || '输入消息后按 Enter'}
        </Text>
      </Box>
    </Box>
  );
}
