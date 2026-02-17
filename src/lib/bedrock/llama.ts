import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamLlama(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['llama-4-maverick'];

  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);

  console.log('[Llama] Starting stream with model:', model.bedrockId);
  console.log('[Llama] Message count:', validMessages.length);

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      messages: validMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      max_gen_len: 4096,
      temperature: 0.7,
      
    }),
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    console.log('[Llama] Sending command to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('[Llama] Response received, starting stream...');
    
    let inputTokens = 0;
    let outputTokens = 0;
    let hasGeneratedContent = false;

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const raw = new TextDecoder().decode(event.chunk.bytes);
          
          try {
            const chunk = JSON.parse(raw);

            // Format 1: Llama native { generation: "text", stop_reason, prompt_token_count, generation_token_count }
            if (chunk.generation !== undefined && chunk.generation !== null) {
              const text = chunk.generation;
              if (typeof text === 'string' && text.length > 0) {
                hasGeneratedContent = true;
                yield text;
              }
              if (chunk.prompt_token_count) inputTokens = chunk.prompt_token_count;
              if (chunk.generation_token_count) outputTokens = chunk.generation_token_count;
            }

            // Format 2: OpenAI-compatible { choices: [{ delta: { content } }] }
            if (chunk.choices?.[0]?.delta?.content) {
              const text = chunk.choices[0].delta.content;
              if (text.length > 0) {
                hasGeneratedContent = true;
                yield text;
              }
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

    if (!hasGeneratedContent) {
      console.error('[Llama] No content generated!');
      throw new Error('Llama did not generate any content. The model may be unavailable or rate limited.');
    }

    console.log('[Llama] Stream completed. Tokens:', { inputTokens, outputTokens });
    const costUSD = (inputTokens / 1000) * model.inputPricePer1K + (outputTokens / 1000) * model.outputPricePer1K;
    return { inputTokens, outputTokens, costUSD: Number(costUSD.toFixed(6)) };
  } catch (error) {
    console.error('[Llama] Stream error:', error);
    if (error instanceof Error) {
      // Provide helpful error messages
      if (error.message.includes('ResourceNotFoundException')) {
        throw new Error(`Llama model not available in region ${model.region}. Please check AWS Bedrock console.`);
      } else if (error.message.includes('AccessDeniedException')) {
        throw new Error('Access denied to Llama model. Please check IAM permissions.');
      } else if (error.message.includes('ThrottlingException')) {
        throw new Error('Llama request throttled. Please wait and try again.');
      }
    }
    throw error;
  }
}
