import type OpenAI from 'openai';
import type {AppConfig, ScreenSummary} from '../types.js';
import {summarizeScreen} from '../ai/vision.js';
import {captureFullDesktop} from './screenshot.js';

export async function observeScreen(options: {
  client?: OpenAI;
  config: AppConfig;
}): Promise<ScreenSummary> {
  const image = await captureFullDesktop();
  return summarizeScreen({
    client: options.client,
    config: options.config,
    image
  });
}
