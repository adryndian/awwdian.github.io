import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from './client';
import { MODELS } from '../models/config';

export async function* streamDeepSeek(
  messages: { role: string; content: string }[]
): AsyncGenerator<string, { inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS['deepseek-r1'];

  const validMessages = messages.filter(m => m.content && m.content.trim().length > 0);

  console.log('[DeepSeek] Starting stream with model:', model.bedrockId);
  console.log('[DeepSeek] Message count:', validMessages.length);

  const command = new InvokeModelWithResponseStreamCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      prompt,
      max_tokens: 8096,
      temperature: 0.7,
    }),
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    console.log('[DeepSeek] Sending command to Bedrock...');
    const response = await bedrockClient.send(command);
    console.log('[DeepSeek] Response received, starting stream...');
    
    let inputTokens = 0;
    let outputTokens = 0;
    let hasGeneratedContent = false;

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk?.bytes) {
          const raw = new TextDecoder().decode(event.chunk.bytes);
          
          try {
            const chunk = JSON.parse(raw);
            
            // DeepSeek R1 format: { choices: [{ delta: { content?, reasoning_content? }, finish_reason }], usage }
            const delta = chunk.choices?.[0]?.delta;
const content = delta?.content || '';
const reasoning = delta?.reasoning_content ||'';
            
            if (delta) {
              // Prioritas: ambil content dulu, fallback ke reasoning jika tidak ada
              const text = delta.content || delta.reasoning_content || '';
              if (text && text.length > 0) {
                hasGeneratedContent = true;
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

    if (!hasGeneratedContent) {
      console.error('[DeepSeek] No content generated!');
      throw new Error('DeepSeek did not generate any content. The model may be unavailable or rate limited.');
    }

    console.log('[DeepSeek] Stream completed. Tokens:', { inputTokens, outputTokens });
    const costUSD = (inputTokens / 1000) * model.inputPricePer1K + (outputTokens / 1000) * model.outputPricePer1K;
    return { inputTokens, outputTokens, costUSD: Number(costUSD.toFixed(6)) };
  } catch (error) {
    console.error('[DeepSeek] Stream error:', error);
    if (error instanceof Error) {
      // Provide helpful error messages
      if (error.message.includes('ResourceNotFoundException')) {
        throw new Error(`DeepSeek model not available in region ${model.region}. Please check AWS Bedrock console.`);
      } else if (error.message.includes('AccessDeniedException')) {
        throw new Error('Access denied to DeepSeek model. Please check IAM permissions.');
      } else if (error.message.includes('ThrottlingException')) {
        throw new Error('DeepSeek request throttled. Please wait and try again.');
      }
    }
    throw error;
  }
}
