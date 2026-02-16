import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamLlama(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['llama-4-maverick'];

  // Format pesan untuk Llama 4 - gunakan format prompt dengan <|begin_of_text|>
  // Llama 4 Instruct menggunakan format messages API seperti Llama 3+
  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      max_gen_len: 4096,
      temperature: 0.7,
      top_p: 0.9,
    }),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await bedrockClient.send(command);

  let inputTokens = 0;
  let outputTokens = 0;

  if (response.body) {
    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        try {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

          // Llama streaming response format: { generation: "...", stop_reason: null|"stop" }
          const text = chunk.generation || '';
          if (text) {
            outputTokens += 1; // approximate counter
            yield text;
          }

          // Token usage ada di chunk terakhir
          if (chunk.prompt_token_count != null) {
            inputTokens = chunk.prompt_token_count;
          }
          if (chunk.generation_token_count != null) {
            outputTokens = chunk.generation_token_count;
          }
          if (chunk.amazon_bedrock_invocationMetrics) {
            inputTokens = chunk.amazon_bedrock_invocationMetrics.inputTokenCount || inputTokens;
            outputTokens = chunk.amazon_bedrock_invocationMetrics.outputTokenCount || outputTokens;
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
