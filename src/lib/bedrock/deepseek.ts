import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { client } from './client';
import { MODELS } from '../models/config';
import { Message, ExtractedFile } from '@/types';

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
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
    contentType: 'application/json',
  });

  const response = await client.send(command);

  let inputTokens = 0;
  let outputTokens = 0;

  // response.body is AsyncIterable<ResponseStream> — use for await, NOT getReader()
  if (response.body) {
    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        try {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          const content = chunk.choices?.[0]?.delta?.content || '';
          if (content) {
            outputTokens += 1;
            yield content;
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens || inputTokens;
            outputTokens = chunk.usage.completion_tokens || outputTokens;
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  const costUSD =
    (inputTokens / 1000) * model.inputPricePer1K +
    (outputTokens / 1000) * model.outputPricePer1K;

  return {
    inputTokens,
    outputTokens,
    costUSD: Number(costUSD.toFixed(6)),
  };
}
