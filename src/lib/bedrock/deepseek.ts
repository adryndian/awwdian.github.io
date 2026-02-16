import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamDeepSeek(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['deepseek-r1'];

  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      messages: validMessages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 8096,
      temperature: 0.7,
    }),
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    const response = await bedrockClient.send(command);
    let inputTokens = 0;
    let outputTokens = 0;

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const raw = new TextDecoder().decode(event.chunk.bytes);
          console.log('[DeepSeek] Raw chunk:', raw); // Debug log
          
          try {
            const chunk = JSON.parse(raw);
            
            // DeepSeek R1 format: { choices: [{ delta: { content?, reasoning_content? }, finish_reason }], usage }
            const delta = chunk.choices?.[0]?.delta;
            
            if (delta) {
              // Prioritas: ambil content dulu, fallback ke reasoning jika tidak ada
              const text = delta.content || delta.reasoning_content || '';
              if (text && text.length > 0) {
                yield text;
              }
            }

            // Usage di chunk terakhir
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || chunk.usage.input_tokens || 0;
              outputTokens = chunk.usage.completion_tokens || chunk.usage.output_tokens || 0;
            }
          } catch (parseErr) {
            console.error('[DeepSeek] Parse error:', parseErr, 'Raw:', raw);
          }
        }
      }
    }

    const costUSD = (inputTokens / 1000) * model.inputPricePer1K + (outputTokens / 1000) * model.outputPricePer1K;
    return { inputTokens, outputTokens, costUSD: Number(costUSD.toFixed(6)) };
  } catch (error) {
    console.error('[DeepSeek] Stream error:', error);
    throw error;
  }
}
