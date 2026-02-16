import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { MODELS } from './models/config';
import { ModelId } from '@/types';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: { name: string; content: string }[];
}

export async function invokeModel(
  messages: Message[], 
  modelId: ModelId
): Promise<{ content: string; inputTokens: number; outputTokens: number; costUSD: number }> {
  const model = MODELS[modelId];
  
  // Format: Claude (Anthropic)
  if (modelId.startsWith('claude')) {
    const command = new InvokeModelCommand({
      modelId: model.bedrockId,
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: 0.7,
      }),
      contentType: 'application/json',
    });

    const response = await client.send(command);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    
    const inputTokens = body.usage?.input_tokens || 0;
    const outputTokens = body.usage?.output_tokens || 0;
    
    return {
      content: body.content?.[0]?.text || '',
      inputTokens,
      outputTokens,
      costUSD: (inputTokens / 1000) * model.inputPricePer1K + (outputTokens / 1000) * model.outputPricePer1K,
    };
  }
  
  // Format: DeepSeek (OpenAI compatible)
  else if (modelId === 'deepseek-r1') {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId: model.bedrockId, // ARN inference profile
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        max_tokens: 4096,
        temperature: 0.7,
        stream: true
      }),
      contentType: 'application/json',
    });

    // Untuk non-streaming response, kita gunakan invoke biasa atau handle stream
    // Ini versi simplified - nanti kita handle streaming di API route
    const response = await client.send(command as any);
    const body = JSON.parse(new TextDecoder().decode(response.body));
    
    return {
      content: body.choices?.[0]?.message?.content || '',
      inputTokens: body.usage?.prompt_tokens || 0,
      outputTokens: body.usage?.completion_tokens || 0,
      costUSD: (body.usage?.prompt_tokens / 1000) * 0.5 + (body.usage?.completion_tokens / 1000) * 2.0,
    };
  }

  throw new Error('Unsupported model');
}

// Streaming khusus DeepSeek
export async function* streamDeepSeek(messages: Message[]) {
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

  const response = await client.send(command);
  const reader = response.body?.getReader();
  
  if (!reader) throw new Error('No stream reader');

  let inputTokens = 0;
  let outputTokens = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) yield content;
            
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || inputTokens;
              outputTokens = parsed.usage.completion_tokens || outputTokens;
            }
          } catch (e) {
            // skip malformed
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { inputTokens, outputTokens };
}
