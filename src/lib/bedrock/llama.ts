import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamLlama(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['llama-4-maverick'];

  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
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

  try {
    const response = await bedrockClient.send(command);
    let inputTokens = 0;
    let outputTokens = 0;

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const raw = new TextDecoder().decode(event.chunk.bytes);
          console.log('[Llama] Raw chunk:', raw); // Debug log
          
          try {
            const chunk = JSON.parse(raw);

            // Format 1: Llama native { generation: "text", stop_reason, prompt_token_count, generation_token_count }
            if (chunk.generation !== undefined && chunk.generation !== null) {
              const text = chunk.generation;
              if (typeof text === 'string' && text.length > 0) {
                yield text;
              }
              if (chunk.prompt_token_count) inputTokens = chunk.prompt_token_count;
              if (chunk.generation_token_count) outputTokens = chunk.generation_token_count;
            }

            // Format 2: OpenAI-compatible { choices: [{ delta: { content } }] }
            if (chunk.choices?.[0]?.delta?.content) {
              const text = chunk.choices[0].delta.content;
              if (text.length > 0) yield text;
            }

            // Bedrock metrics
            const metrics = chunk['amazon-bedrock-invocationMetrics'] || chunk.amazon_bedrock_invocationMetrics;
            if (metrics) {
              inputTokens = metrics.inputTokenCount || inputTokens;
              outputTokens = metrics.outputTokenCount || outputTokens;
            }
          } catch (parseErr) {
            console.error('[Llama] Parse error:', parseErr, 'Raw:', raw);
          }
        }
      }
    }

    const costUSD = (inputTokens / 1000) * model.inputPricePer1K + (outputTokens / 1000) * model.outputPricePer1K;
    return { inputTokens, outputTokens, costUSD: Number(costUSD.toFixed(6)) };
  } catch (error) {
    console.error('[Llama] Stream error:', error);
    throw error;
  }
}
