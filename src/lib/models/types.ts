/**
 * TypeScript definitions untuk type safety antar file
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  enableThinking?: boolean; // Khusus untuk Opus 4.6
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  thinking?: string; // Opus 4.6 thinking content
}

// Bedrock specific types
export interface BedrockPayload {
  modelId: string;
  body: string;
  contentType: string;
  accept: string;
}

// Anthropic Messages API format
export interface AnthropicPayload {
  anthropic_version: string;
  max_tokens: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{type: string; text?: string; image?: any}>;
  }>;
  system?: string;
  temperature?: number;
  thinking?: {
    type: 'enabled';
    budget_tokens: number;
  };
}

// Llama instruct format
export interface LlamaPayload {
  prompt: string;
  max_gen_len: number;
  temperature?: number;
  top_p?: number;
}
