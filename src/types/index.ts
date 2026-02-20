export type ModelId = string;
export type MessageRole = 'user' | 'assistant' | 'system';
export type AiStatus = 'idle' | 'loading' | 'streaming' | 'error';
export type ModelProvider = 'Anthropic' | 'Meta';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: string;
  modelName?: string;
  cost?: number;
  thinking?: string;
  files?: FileAttachment[];
}

export interface ModelConfig {
  id: string;
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

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  enableThinking?: boolean;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  thinking?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model?: string;
  cost?: number;
}

export interface ApiResponse {
  content?: string;
  message?: string;
  error?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  modelName?: string;
  thinking?: string;
  duration?: number;
  provider?: string;
}

export interface SendMessagePayload {
  message: string;
  modelId: string;
  history: { role: string; content: string }[];
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

export type ExtractedFile = {
  name: string;
  extension: string;
  content: string;
};