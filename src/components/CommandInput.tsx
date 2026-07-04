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
    <Box borderStyle="single" paddingX={1}>
      <Text color="green">&gt; </Text>
      <Text>{props.disabled ? '处理中...' : value}</Text>
    </Box>
  );
}
