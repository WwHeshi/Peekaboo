import dotenv from 'dotenv';
import type {AppConfig} from '../types.js';

dotenv.config();

export function loadConfig(): AppConfig {
  return {
    apiKey: optionalEnv('OPENAI_API_KEY'),
    baseUrl: optionalEnv('OPENAI_BASE_URL'),
    model: optionalEnv('OPENAI_MODEL') || 'gpt-4o-mini',
    petName: optionalEnv('PET_NAME') || 'Peekaboo'
  };
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
