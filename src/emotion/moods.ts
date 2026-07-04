import type {Mood} from '../types.js';

export const moodEyes: Record<Mood, [string, string]> = {
  idle: ['O', 'O'],
  smile: ['-', '-'],
  happy: ['^', '^'],
  curious: ['o', 'O'],
  thinking: ['.', '.'],
  surprised: ['@', '@'],
  sleepy: ['_', '_'],
  sad: ['T', 'T']
};

export function isMood(value: string): value is Mood {
  return Object.hasOwn(moodEyes, value);
}
