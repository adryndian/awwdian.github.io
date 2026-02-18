// src/lib/bedrock/transformers.ts
import type { ChatMessage } from '@/lib/models/types';
import type { ModelConfig } from '@/types';

export class PayloadTransformer {

  static toAnthropic(messages: ChatMessage[], config: ModelConfig, options: any = {}) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages = conversationMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const payload: any = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || config.maxTokens,
      messages: anthropicMessages,
      temperature: options.temperature ?? 0.7,
    };

    if (systemMessage) {
      payload.system = systemMessage.content;
    }

    if (config.supportsThinking && options.enableThinking) {
      payload.thinking = { type: 'enabled', budget_tokens: 5000 };
      delete payload.temperature;
    }

    return payload;
  }

  static toDeepSeek(messages: ChatMessage[], config: ModelConfig, options: any = {}) {
    const systemMessage = messages.find((m) => m.role === 'system');
    const filtered = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

    const finalMessages = systemMessage
      ? [
          { role: 'user' as const, content: '[System]: ' + systemMessage.content },
          { role: 'assistant' as const, content: 'Understood.' },
          ...filtered,
        ]
      : filtered;

    return {
      messages: finalMessages,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature ?? 0.6,
      top_p: 0.9,
    };
  }

  static toLlama(messages: ChatMessage[], config: ModelConfig, options: any = {}) {
    let prompt = '<|begin_of_text|>';
    for (const msg of messages) {
      if (msg.role === 'system') {
        prompt += '<|start_header_id|>system<|end_header_id|>\n' + msg.content + '<|eot_id|>';
      } else if (msg.role === 'user') {
        prompt += '<|start_header_id|>user<|end_header_id|>\n' + msg.content + '<|eot_id|>';
      } else if (msg.role === 'assistant') {
        prompt += '<|start_header_id|>assistant<|end_header_id|>\n' + msg.content + '<|eot_id|>';
      }
    }
    prompt += '<|start_header_id|>assistant<|end_header_id|>\n';
    return {
      prompt,
      max_gen_len: options.maxTokens || config.maxTokens,
      temperature: options.temperature ?? 0.5,
      top_p: 0.9,
    };
  }

  static parseResponse(body: Uint8Array, config: ModelConfig) {
    const response = JSON.parse(new TextDecoder().decode(body));

    if (config.provider === 'anthropic') {
      let content = '';
      let thinking = '';
      if (Array.isArray(response.content)) {
        for (const block of response.content) {
          if (block.type === 'thinking') thinking += block.thinking || '';
          else if (block.type === 'text') content += block.text || '';
        }
      } else {
        content = response.completion || response.content || '';
      }
      return {
        content,
        thinking: thinking || undefined,
        usage: response.usage
          ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
          : undefined,
      };
    }

    if (config.provider === 'deepseek') {
      if (response.choices && response.choices.length > 0) {
        const choice = response.choices[0];
        return {
          content: choice.message?.content || '',
          thinking: choice.message?.reasoning_content || undefined,
          usage: response.usage
            ? { inputTokens: response.usage.prompt_tokens || 0, outputTokens: response.usage.completion_tokens || 0 }
            : undefined,
        };
      }
      return { content: response.output || response.generation || '' };
    }

    if (config.provider === 'meta') {
      return {
        content: response.generation || response.completion || '',
        usage: response.usage
          ? { inputTokens: response.usage.prompt_tokens || 0, outputTokens: response.usage.completion_tokens || 0 }
          : undefined,
      };
    }

    throw new Error('Unknown provider: ' + config.provider);
  }
}
