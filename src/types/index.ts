// src/types/index.ts
export type ModelId =
  | 'us.anthropic.claude-opus-4-6-v1:0'
  | 'us.anthropic.claude-sonnet-4-0-v1:0'
  | 'us.deepseek.r1-v1:0'
  | 'us.meta.llama4-maverick-17b-instruct-v1:0';

export type ModelProvider = 'anthropic' | 'deepseek' | 'meta';

export interface ModelConfig {
  id: ModelId;
  name: string;
  provider: ModelProvider;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsThinking?: boolean;
  description: string;
  costLevel: 'high' | 'medium' | 'low';
  inputPricePer1K: number;
  outputPricePer1K: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export type AiStatus = 'idle' | 'loading' | 'streaming' | 'error';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: ModelId;
  cost?: number;
  thinking?: string;
  files?: FileAttachment[];
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: ModelId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse {
  content?: string;
  error?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  thinking?: string;
  duration?: number;
}

export interface SendMessagePayload {
  model: ModelId;
  message: string;
  history: {
    role: MessageRole;
    content: string;
  }[];
}

export type ExtractedFile = {
  name: string;
  extension: string;
  content: string;
};
