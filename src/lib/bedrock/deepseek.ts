import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamDeepSeek(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['deepseek-r1'];

  // Filter pesan kosong sebelum kirim ke Bedrock
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

  const response = await bedrockClient.send(command);

  let inputTokens = 0;
  let outputTokens = 0;
  let isInThinkingPhase = false;

  if (response.body) {
    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        try {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

          // DeepSeek R1 pada Bedrock: OpenAI-compatible format
          // reasoning_content = internal thinking (tidak ditampilkan)
          // content = jawaban final (yang ditampilkan)
          const delta = chunk.choices?.[0]?.delta;

          if (delta) {
            // Cek apakah ada reasoning (thinking phase)
            if (delta.reasoning_content) {
              isInThinkingPhase = true;
              // Tidak yield reasoning — hanya tampilkan jawaban final
            }

            // Yield hanya content jawaban final
            if (delta.content) {
              isInThinkingPhase = false;
              outputTokens += 1;
              yield delta.content;
            }
          }

          // Ambil token usage dari chunk terakhir
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens || chunk.usage.input_tokens || inputTokens;
            outputTokens = chunk.usage.completion_tokens || chunk.usage.output_tokens || outputTokens;
          }

          // Beberapa format Bedrock taruh usage di level atas
          if (chunk.prompt_token_count) inputTokens = chunk.prompt_token_count;
          if (chunk.generation_token_count) outputTokens = chunk.generation_token_count;

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
