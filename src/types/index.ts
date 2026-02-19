// src/types/index.ts

// ============================================
// Import canonical types from models config
// ============================================
import type {
  ModelId as ConfigModelId,
  ModelConfig as ConfigModelConfig,
  Provider,
} from '@/lib/models/config';

// Re-export canonical ModelId (single source of truth)
export type ModelId = ConfigModelId;
export type ModelProvider = Provider;
export type { ConfigModelConfig as ModelConfigType };

// ============================================
// Message Types
// ============================================
export type MessageRole = 'user' | 'assistant' | 'system';

export type AiStatus = 'idle' | 'loading' | 'streaming' | 'error';

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

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
}

// ============================================
// Chat Session Types
// ============================================
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: ModelId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Types
// ============================================
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
  history: {
    role: MessageRole;
    content: string;
  }[];
  temperature?: number;
  maxTokens?: number;
}

export type ExtractedFile = {
  name: string;
  extension: string;
  content: string;
};
