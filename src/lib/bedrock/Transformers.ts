/**
 * Transformers - Konversi unified format ke format spesifik provider
 * Mencegah bentrok format antara Claude (Messages API) vs Llama (Instruct)
 */

import { 
  ChatMessage, 
  AnthropicPayload, 
  LlamaPayload,
  ModelConfig 
} from '@/lib/models/types';

export class PayloadTransformer {
  /**
   * Transform ke format Anthropic Messages API
   * Untuk: Claude Opus 4.6 & Sonnet 4.0
   */
  static toAnthropic(
    messages: ChatMessage[],
    config: ModelConfig,
    options: {
      maxTokens?: number;
      temperature?: number;
      enableThinking?: boolean;
    } = {}
  ): AnthropicPayload {
    // Pisahkan system message dari conversation
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    // Convert ke format Anthropic (hanya user/assistant, no system)
    const anthropicMessages = conversationMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const payload: AnthropicPayload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || config.maxTokens,
      messages: anthropicMessages,
      temperature: options.temperature ?? 0.7,
    };

    // Tambahkan system prompt jika ada
    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    // Enable thinking untuk Opus 4.6 jika diminta
    if (config.supportsThinking && options.enableThinking) {
      payload.thinking = {
        type: 'enabled',
        budget_tokens: 2000, // Bisa diexpose sebagai parameter
      };
      // Thinking mode tidak compatible dengan temperature
      delete payload.temperature;
    }

    return payload;
  }

  /**
   * Transform ke format Llama Instruct
   * Untuk: Llama 4 Maverick
   */
  static toLlama(
    messages: ChatMessage[],
    config: ModelConfig,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): LlamaPayload {
    // Build prompt dengan format chat template Llama
    const prompt = this.buildLlamaPrompt(messages);
    
    return {
      prompt,
      max_gen_len: options.maxTokens || config.maxTokens,
      temperature: options.temperature ?? 0.5,
      top_p: 0.9,
    };
  }

  /**
   * Build Llama chat prompt dengan format yang benar
   * Llama 4 Maverick menggunakan format <|begin_of_text|>... dll
   */
  private static buildLlamaPrompt(messages: ChatMessage[]): string {
    let prompt = '<|begin_of_text|>';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        prompt += `<|start_header_id|>system<|end_header_id|>\n${msg.content}<|eot_id|>`;
      } else if (msg.role === 'user') {
        prompt += `<|start_header_id|>user<|end_header_id|>\n${msg.content}<|eot_id|>`;
      } else if (msg.role === 'assistant') {
        prompt += `<|start_header_id|>assistant<|end_header_id|>\n${msg.content}<|eot_id|>`;
      }
    }
    
    // Tambahkan header untuk response assistant
    prompt += '<|start_header_id|>assistant<|end_header_id|>\n';
    
    return prompt;
  }

  /**
   * Response parser untuk tiap provider
   */
  static parseResponse(body: Uint8Array, config: ModelConfig): {
    content: string;
    thinking?: string;
    usage?: { inputTokens: number; outputTokens: number };
  } {
    const responseText = new TextDecoder().decode(body);
    const response = JSON.parse(responseText);

    if (config.provider === 'anthropic') {
      return this.parseAnthropicResponse(response);
    } else if (config.provider === 'meta') {
      return this.parseLlamaResponse(response);
    }
    
    throw new Error(`Unknown provider: ${config.provider}`);
  }

  private static parseAnthropicResponse(response: any) {
    // Handle thinking content untuk Opus 4.6
    let content = '';
    let thinking = '';
    
    if (response.content && Array.isArray(response.content)) {
      for (const block of response.content) {
        if (block.type === 'thinking') {
          thinking += block.thinking || '';
        } else if (block.type === 'text') {
          content += block.text || '';
        }
      }
    } else {
      content = response.completion || response.content || '';
    }

    return {
      content,
      thinking: thinking || undefined,
      usage: response.usage ? {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      } : undefined,
    };
  }

  private static parseLlamaResponse(response: any) {
    return {
      content: response.generation || response.completion || '',
      usage: response.usage ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      } : undefined,
    };
  }
}
