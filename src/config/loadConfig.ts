import dotenv from 'dotenv';
import type {AppConfig} from '../types.js';

dotenv.config();

export function loadConfig(): AppConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    petName: process.env.PET_NAME || 'Peekaboo'
  };
}
