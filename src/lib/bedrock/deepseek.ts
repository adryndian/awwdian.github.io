import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamDeepSeek(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['deepseek-r1'];

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
      temperature: 0.7,
    }),
    contentType: 'application/json',
  });

  const response = await bedrockClient.send(command);
  
  let inputTokens = 0;
  let outputTokens = 0;

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

  const costUSD = (inputTokens / 1000) * model.inputPricePer1K +
                  (outputTokens / 1000) * model.outputPricePer1K;

  return {
    inputTokens,
    outputTokens,
    costUSD: Number(costUSD.toFixed(6)),
  };
}
