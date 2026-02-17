/**
 * Unified Invoker - Single interface untuk invoke semua model
 * Handle perbedaan logic tanpa bentrok
 */

import { 
  InvokeModelCommand, 
  InvokeModelWithResponseStreamCommand,
  ResponseStream
} from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClient } from './client';
import { PayloadTransformer } from './transformers';
import { 
  ChatRequest, 
  ChatResponse, 
  ChatMessage 
} from '@/lib/models/types';
import { ModelConfig, getModelConfig } from '@/types';

export class BedrockInvoker {
  /**
   * Invoke model (non-streaming)
   */
  static async invoke(request: ChatRequest): Promise<ChatResponse> {
    const config = getModelConfig(request.modelId || '');
    const client = getBedrockClient();
    
    const payload = this.buildPayload(request.messages, config, {
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      enableThinking: request.enableThinking,
    });

    const command = new InvokeModelCommand({
      modelId: config.id,
      body: JSON.stringify(payload),
      contentType: 'application/json',
      accept: 'application/json',
    });

    try {
      const response = await client.send(command);
      const parsed = PayloadTransformer.parseResponse(response.body as Uint8Array, config);
      
      return {
        content: parsed.content,
        thinking: parsed.thinking,
        usage: parsed.usage,
        model: config.name,
      };
    } catch (error) {
      console.error(`[Bedrock Error - ${config.name}]:`, error);
      throw this.enhanceError(error, config);
    }
  }

  /**
   * Invoke dengan streaming
   * Returns AsyncIterator untuk handle stream beda provider
   */
  static async* invokeStream(request: ChatRequest): AsyncGenerator<string, ChatResponse, unknown> {
    const config = getModelConfig(request.modelId || '');
    const client = getBedrockClient();
    
    if (!config.supportsStreaming) {
      throw new Error(`Model ${config.name} does not support streaming`);
    }

    const payload = this.buildPayload(request.messages, config, {
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      enableThinking: request.enableThinking,
    });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: config.id,
      body: JSON.stringify(payload),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    let fullContent = '';
    let thinking = '';

    if (response.body) {
      for await (const chunk of response.body) {
        const parsed = this.parseStreamChunk(chunk, config);
        
        if (parsed.thinking) {
          thinking += parsed.thinking;
        }
        if (parsed.content) {
          fullContent += parsed.content;
          yield parsed.content; // Yield partial content untuk streaming ke client
        }
      }
    }

    return {
      content: fullContent,
      thinking: thinking || undefined,
      model: config.name,
    } as ChatResponse;
  }

  /**
   * Build payload sesuai provider
   */
  private static buildPayload(
    messages: ChatMessage[],
    config: ModelConfig,
    options: any
  ): object {
    if (config.provider === 'anthropic') {
      return PayloadTransformer.toAnthropic(messages, config, options);
    } else if (config.provider === 'meta') {
      return PayloadTransformer.toLlama(messages, config, options);
    }
    throw new Error(`Unsupported provider: ${config.provider}`);
  }

  /**
   * Parse stream chunk beda provider
   */
  private static parseStreamChunk(chunk: any, config: ModelConfig): {
    content?: string;
    thinking?: string;
  } {
    try {
      if (config.provider === 'anthropic') {
        return this.parseAnthropicChunk(chunk);
      } else if (config.provider === 'meta') {
        return this.parseLlamaChunk(chunk);
      }
    } catch (e) {
      return {};
    }
    return {};
  }

  private static parseAnthropicChunk(chunk: any): { content?: string; thinking?: string } {
    // Anthropic stream format: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "..."}}
    const json = JSON.parse(new TextDecoder().decode(chunk.chunk?.bytes));
    
    if (json.type === 'content_block_delta') {
      if (json.delta?.type === 'text_delta') {
        return { content: json.delta.text };
      } else if (json.delta?.type === 'thinking_delta') {
        return { thinking: json.delta.thinking };
      }
    }
    return {};
  }

  private static parseLlamaChunk(chunk: any): { content?: string } {
    // Llama stream format: {"generation": "..."}
    const json = JSON.parse(new TextDecoder().decode(chunk.chunk?.bytes));
    return { content: json.generation || '' };
  }

  /**
   * Error handler dengan konteks model
   */
  private static enhanceError(error: any, config: ModelConfig): Error {
    const message = error.message || '';
    
    if (message.includes('validationException')) {
      return new Error(`Invalid request format for ${config.name}. Pastikan payload sesuai format ${config.provider}.`);
    }
    if (message.includes('accessDeniedException')) {
      return new Error(`Access denied untuk ${config.name}. Cek IAM permissions untuk inference profile.`);
    }
    if (message.includes('throttlingException')) {
      return new Error(`Rate limit tercapai untuk ${config.name}. Coba gunakan model lain atau tunggu sebentar.`);
    }
    if (message.includes('model not available')) {
      return new Error(`Model ${config.name} belum diaktifkan di AWS Console > Bedrock > Model Access.`);
    }
    
    return error;
  }
}
