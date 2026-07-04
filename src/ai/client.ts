import OpenAI from 'openai';
import type {AppConfig} from '../types.js';

export function createOpenAIClient(config: AppConfig): OpenAI | undefined {
  if (!config.apiKey) {
    return undefined;
  }

  return new OpenAI({apiKey: config.apiKey});
}
