import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { ModelId, supportsFileUpload, supportsImageUpload } from './models';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: UploadedFile[];
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // base64
  size: number;
}

export async function invokeModel(
  messages: Message[], 
  modelId: ModelId,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  }
) {
  const modelSupportsFiles = supportsFileUpload(modelId);
  const modelSupportsImages = supportsImageUpload(modelId);

  // Format messages for Bedrock
  const formattedMessages = messages.map(msg => {
    const content: any[] = [{ type: 'text', text: msg.content }];
    
    // Add files if supported
    if (msg.files && (modelSupportsFiles || modelSupportsImages)) {
      msg.files.forEach(file => {
        if (file.type.startsWith('image/') && modelSupportsImages) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: file.type,
              data: file.data,
            },
          });
        } else if (modelSupportsFiles) {
          // For non-image files, add as text context
          content.push({
            type: 'text',
            text: `\n\n[File: ${file.name}]\n${file.data.substring(0, 1000)}...`,
          });
        }
      });
    }
    
    return {
      role: msg.role,
      content,
    };
  });

  // Different payload structure for different models
  let payload: any;
  
  if (modelId.includes('nova-reels')) {
    // Nova Reels specific payload for image/video generation
    payload = {
      taskType: 'TEXT_IMAGE' as const,
      textToImageParams: {
        text: messages[messages.length - 1]?.content || '',
      },
      imageGenerationConfig: {
        numberOfImages: 1,
        height: 1024,
        width: 1024,
        cfgScale: 8.0,
        seed: Math.floor(Math.random() * 1000000),
      },
    };
  } else {
    // Claude models payload
    payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options?.maxTokens || 4096,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.9,
    };
  }

  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Handle different response formats
    if (modelId.includes('nova-reels')) {
      // Nova returns images in different format
      return {
        content: '[Generated Image/Video]',
        artifacts: responseBody.images?.map((img: any) => img.base64) || [],
      };
    }
    
    // Claude response format
    return {
      content: responseBody.content?.[0]?.text || responseBody.completion || '',
      artifacts: [],
    };
  } catch (error) {
    console.error('Bedrock error:', error);
    throw error;
  }
}

// Streaming support for real-time responses
export async function* invokeModelStream(
  messages: Message[],
  modelId: ModelId,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
) {
  const formattedMessages = messages.map(msg => ({
    role: msg.role,
    content: [{ type: 'text', text: msg.content }],
  }));

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: options?.maxTokens || 4096,
    messages: formattedMessages,
    temperature: options?.temperature ?? 0.7,
  };

  const command = new InvokeModelWithResponseStreamCommand({
    modelId,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await client.send(command);
  
  for await (const chunk of response.body || []) {
    const decoded = new TextDecoder().decode(chunk.chunk?.bytes);
    try {
      const parsed = JSON.parse(decoded);
      const text = parsed.content?.[0]?.text || parsed.delta?.text || '';
      if (text) yield text;
    } catch (e) {
      // Ignore parse errors for incomplete chunks
    }
  }
}
