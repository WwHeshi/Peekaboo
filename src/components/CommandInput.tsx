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
      props.onSubmit('quit');
      return;
    }

    if (input) {
      setValue(current => `${current}${input}`);
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <Box borderStyle="round" borderColor={props.disabled ? 'gray' : 'green'} paddingX={1}>
        <Text color={props.disabled ? 'gray' : 'green'} bold>
          &gt;
        </Text>
        <Text color={props.disabled ? 'gray' : value ? 'white' : 'gray'}>
          {' '}
          {props.disabled ? '处理中...' : value || '输入命令后按 Enter'}
        </Text>
      </Box>
      <Box paddingX={1} justifyContent="space-between">
        <Text color="gray">直接输入聊天</Text>
        <Text color="gray">需要时自动看屏幕</Text>
        <Text color="gray">clear 清空</Text>
        <Text color="gray">quit 退出</Text>
      </Box>
    </Box>
  );
}
