import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { client } from './client';
import { MODELS } from '../models/config';
import { Message, ModelId } from '@/types';

export async function* streamDeepSeek(
  messages: Message[],
  files?: ExtractedFile[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }, unknown> {
  const model = MODELS['deepseek-r1'];
  
  let systemPrompt = '';
  if (files && files.length > 0) {
    systemPrompt = files.map(f => `[File: ${f.name}]\n${f.content}`).join('\n\n');
  }

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
    contentType: 'application/json',
  });

  const response = await client.send(command);
  const reader = response.body?.getReader();
  
  if (!reader) throw new Error('No stream reader');

  let inputTokens = 0;
  let outputTokens = 0;
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            outputTokens += 1; // Estimate
            yield content;
          }
          if (parsed.usage) {
            inputTokens = parsed.usage.prompt_tokens || inputTokens;
            outputTokens = parsed.usage.completion_tokens || outputTokens;
          }
        } catch (e) {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const costUSD = (inputTokens / 1000) * model.inputPricePer1K + (outputTokens / 1000) * model.outputPricePer1K;
  
  return {
    inputTokens,
    outputTokens,
    costUSD: Number(costUSD.toFixed(6)),
  };
}
