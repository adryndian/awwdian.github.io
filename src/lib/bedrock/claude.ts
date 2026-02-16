import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { client } from './client';
import { MODELS } from '../models/config';
import { Message, ModelId, UsageInfo } from '@/types';

export async function invokeClaude(
  messages: Message[],
  modelId: ModelId,
  files?: ExtractedFile[]
): Promise<{ content: string; usage: UsageInfo }> {
  const model = MODELS[modelId];
  
  // Build content with files
  let systemPrompt = '';
  if (files && files.length > 0) {
    systemPrompt = files.map(f => `[File: ${f.name}]\n\`\`\`${f.extension}\n${f.content}\n\`\`\``).join('\n\n');
  }

  const command = new InvokeModelCommand({
    modelId: model.bedrockId,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.7,
    }),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  
  const inputTokens = body.usage?.input_tokens || 0;
  const outputTokens = body.usage?.output_tokens || 0;
  
  return {
    content: body.content?.[0]?.text || '',
    usage: {
      model: modelId,
      inputTokens,
      outputTokens,
      costUSD: (inputTokens / 1000) * model.inputPricePer1K + (outputTokens / 1000) * model.outputPricePer1K,
    },
  };
}
