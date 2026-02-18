// ============================================================
// src/lib/bedrock/invoker.ts — Unified invoker untuk semua model
// ============================================================

import {
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClient } from './client';
import { PayloadTransformer } from './transformers';
import type { ChatRequest, ChatResponse, ChatMessage } from '@/lib/models/types';
import type { ModelConfig } from '@/types';
// FIX: Import dari config, bukan dari @/types
import { getModelConfig } from '@/lib/models/config';

export class BedrockInvoker {

  // ----------------------------------------------------------
  // Non-streaming invoke
  // ----------------------------------------------------------
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
      const parsed = PayloadTransformer.parseResponse(
        response.body as Uint8Array,
        config
      );

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

  // ----------------------------------------------------------
  // Streaming invoke — yields partial chunks
  // ----------------------------------------------------------
  static async *invokeStream(
    request: ChatRequest
  ): AsyncGenerator<string, ChatResponse, unknown> {
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
          yield parsed.content;
        }
      }
    }

    return {
      content: fullContent,
      thinking: thinking || undefined,
      model: config.name,
    } as ChatResponse;
  }

  // ----------------------------------------------------------
  // Build payload by provider
  // ----------------------------------------------------------
  private static buildPayload(
    messages: ChatMessage[],
    config: ModelConfig,
    options: any
  ): object {
    switch (config.provider) {
      case 'anthropic':
        return PayloadTransformer.toAnthropic(messages, config, options);
      case 'deepseek':
        return PayloadTransformer.toDeepSeek(messages, config, options);
      case 'meta':
        return PayloadTransformer.toLlama(messages, config, options);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  // ----------------------------------------------------------
  // Parse streaming chunk by provider
  // ----------------------------------------------------------
  private static parseStreamChunk(
    chunk: any,
    config: ModelConfig
  ): { content?: string; thinking?: string } {
    try {
      const bytes = chunk.chunk?.bytes;
      if (!bytes) return {};

      const json = JSON.parse(new TextDecoder().decode(bytes));

      switch (config.provider) {
        case 'anthropic':
          return this.parseAnthropicChunk(json);
        case 'deepseek':
          return this.parseDeepSeekChunk(json);
        case 'meta':
          return this.parseLlamaChunk(json);
        default:
          return {};
      }
    } catch {
      return {};
    }
  }

  private static parseAnthropicChunk(
    json: any
  ): { content?: string; thinking?: string } {
    if (json.type === 'content_block_delta') {
      if (json.delta?.type === 'text_delta') {
        return { content: json.delta.text };
      }
      if (json.delta?.type === 'thinking_delta') {
        return { thinking: json.delta.thinking };
      }
    }
    return {};
  }

  private static parseDeepSeekChunk(
    json: any
  ): { content?: string; thinking?: string } {
    // DeepSeek R1 streaming: OpenAI-compatible SSE chunks
    if (json.choices && json.choices.length > 0) {
      const delta = json.choices[0].delta;
      return {
        content: delta?.content || undefined,
        thinking: delta?.reasoning_content || undefined,
      };
    }
    return {};
  }

  private static parseLlamaChunk(json: any): { content?: string } {
    return { content: json.generation || '' };
  }

  // ----------------------------------------------------------
  // Error enhancer — pesan error yang lebih deskriptif
  // ----------------------------------------------------------
  private static enhanceError(error: any, config: ModelConfig): Error {
    const message = error.message || '';
    const name = error.name || '';

    if (name === 'ValidationException' || message.includes('validationException')) {
      return new Error(
        `[${config.name}] Format payload tidak valid. Pastikan model sudah diaktifkan di Bedrock Console.`
      );
    }
    if (name === 'AccessDeniedException' || message.includes('accessDeniedException')) {
      return new Error(
        `[${config.name}] Access denied. Cek IAM permission: bedrock:InvokeModel dan bedrock:InvokeModelWithResponseStream.`
      );
    }
    if (name === 'ThrottlingException' || message.includes('throttling')) {
      return new Error(
        `[${config.name}] Rate limit tercapai. Coba lagi atau gunakan model lain.`
      );
    }
    if (message.includes('model not available') || message.includes('ResourceNotFoundException')) {
      return new Error(
        `[${config.name}] Model belum diaktifkan. Aktifkan di: AWS Console → Bedrock → Model Access → Enable "${config.id}".`
      );
    }

    return error;
  }
}
