import type OpenAI from 'openai';
import {z} from 'zod';
import type {AppConfig, ScreenSummary} from '../types.js';

const summarySchema = z.object({
  summary: z.string().min(1),
  confidence: z.enum(['low', 'medium', 'high'])
});

export async function summarizeScreen(options: {
  client?: OpenAI;
  config: AppConfig;
  image: Buffer;
}): Promise<ScreenSummary> {
  const {client, config, image} = options;

  if (!client) {
    return {
      summary: '已经截取全桌面截图。当前没有 OPENAI_API_KEY，所以只完成了截图，没有进行视觉理解。',
      confidence: 'low'
    };
  }

  const base64 = image.toString('base64');

  const completion = await client.chat.completions.create({
    model: config.model,
    response_format: {type: 'json_object'},
    messages: [
      {
        role: 'system',
        content:
          '你会看到一张用户主动触发的全桌面截图。请只做高层次视觉理解，不要 OCR，不要逐字抄写屏幕文字，不要推断敏感身份信息。输出 JSON：{"summary":"1-3 句中文概括用户大概在做什么","confidence":"low|medium|high"}。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请观察这张桌面截图，用简短中文总结用户大概正在做什么。'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64}`,
              detail: 'low'
            }
          }
        ]
      }
    ]
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    return {summary: '视觉模型没有返回摘要。', confidence: 'low'};
  }

  const json = safeJson(content);
  if (!json) {
    return {summary: content.slice(0, 240), confidence: 'medium'};
  }

  const parsed = summarySchema.safeParse(json);
  if (!parsed.success) {
    return {summary: content.slice(0, 240), confidence: 'medium'};
  }

  return parsed.data;
}

function safeJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return undefined;
    }

    try {
      return JSON.parse(match[0]);
    } catch {
      return undefined;
    }
  }
}
