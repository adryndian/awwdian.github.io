// src/types/index.ts

// Definisikan ModelId LANGSUNG di sini (tidak import dari config.ts)
export type ModelId = 
  | 'us.anthropic.claude-opus-4-6-v1'
  | 'us.anthropic.claude-sonnet-4-0-v1'
  | 'us.meta.llama4-maverick-17b-instruct-v1';

// Definisikan ModelConfig juga di sini (untuk digunakan config.ts)
export interface ModelConfig {
  id: ModelId;
  name: string;
  provider: 'anthropic' | 'meta';
  maxTokens: number;
  supportsStreaming: boolean;
  supportsThinking?: boolean;
  description: string;
  costLevel: 'high' | 'medium' | 'low';
}

// Tidak ada re-export dari '@/lib/models/config' untuk menghindari circular dependency

export type ExtractedFile = {
  name: string;
  extension: string;
  content: string;
};

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: ModelId;
  cost?: number;
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
