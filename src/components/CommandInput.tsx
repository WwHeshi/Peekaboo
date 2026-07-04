import React, {useEffect, useRef} from 'react';
import ansiEscapes from 'ansi-escapes';
import {useStdout} from 'ink';

export function CommandInput(props: {
  disabled: boolean;
  onSubmit: (value: string) => void;
}) {
  const {stdout} = useStdout();
  const disabledRef = useRef(props.disabled);
  const onSubmitRef = useRef(props.onSubmit);
  const bufferRef = useRef('');
  const promptTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    disabledRef.current = props.disabled;
    onSubmitRef.current = props.onSubmit;
  }, [props.disabled, props.onSubmit]);

  useEffect(() => {
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
      promptTimerRef.current = undefined;
    }

    if (props.disabled) {
      stdout.write(ansiEscapes.cursorHide);
      return;
    }

    promptTimerRef.current = setTimeout(() => {
      stdout.write(`${ansiEscapes.cursorShow}> `);
      promptTimerRef.current = undefined;
    }, 50);

    return () => {
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
        promptTimerRef.current = undefined;
      }
    };
  }, [props.disabled, stdout]);

  useEffect(() => {
    const stdin = process.stdin;
    stdin.setEncoding('utf8');

    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }

    stdin.resume();

    function handleData(chunk: string) {
      bufferRef.current += chunk;
      const lines = bufferRef.current.split(/\r?\n/);
      bufferRef.current = lines.pop() ?? '';

      for (const line of lines) {
        stdout.write(`${ansiEscapes.cursorUp(1)}${ansiEscapes.eraseLine}`);

        if (!disabledRef.current) {
          onSubmitRef.current(line);
        }
      }
    }

    stdin.on('data', handleData);

    return () => {
      stdin.off('data', handleData);
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
      }
      stdout.write(ansiEscapes.cursorShow);
    };
  }, [stdout]);

  return null;
}
