import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamLlama(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['llama-4-maverick'];

  // Filter pesan kosong sebelum kirim ke Bedrock
  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      // Llama 4 Instruct pada Bedrock menggunakan format messages API
      messages: validMessages.map(m => ({
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
          const raw = new TextDecoder().decode(event.chunk.bytes);
          const chunk = JSON.parse(raw);

          // Format 1: Llama 3+ standard Bedrock streaming
          // {"generation": "text", "stop_reason": null, "prompt_token_count": null, "generation_token_count": 1}
          if (chunk.generation !== undefined) {
            const text = chunk.generation || '';
            if (text) {
              outputTokens += 1;
              yield text;
            }

            // Token count di chunk terakhir (stop_reason !== null)
            if (chunk.prompt_token_count != null) inputTokens = chunk.prompt_token_count;
            if (chunk.generation_token_count != null) outputTokens = chunk.generation_token_count;
          }

          // Format 2: OpenAI-compatible (jika Bedrock update format Llama 4)
          if (chunk.choices?.[0]?.delta?.content) {
            yield chunk.choices[0].delta.content;
            outputTokens += 1;
          }

          // Metadata metrics dari Bedrock
          const metrics = chunk['amazon-bedrock-invocationMetrics'] || chunk.amazon_bedrock_invocationMetrics;
          if (metrics) {
            inputTokens = metrics.inputTokenCount || inputTokens;
            outputTokens = metrics.outputTokenCount || outputTokens;
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
