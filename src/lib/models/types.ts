// src/lib/models/types.ts
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
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
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  thinking?: string;
  cost?: number;
}
