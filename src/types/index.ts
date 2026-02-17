// src/types/index.ts

export type ExtractedFile = {
  name: string;
  extension: string;
  content: string;
};

export type ModelType = "claude" | "llama" | "deepseek";

// Define ModelId type directly (avoid circular dependency)
export type ModelId = 
  | 'us.anthropic.claude-opus-4-6-v1'
  | 'us.anthropic.claude-sonnet-4-0-v1'
  | 'us.meta.llama4-maverick-17b-instruct-v1';

// Define ModelConfig interface directly
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

// Re-export values and functions from lib/models/config
export { MODELS, DEFAULT_MODEL, AWS_REGION, isValidModelId, getModelConfig } from "@/lib/models/config";

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: ModelType;
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
  model: ModelType;
  createdAt: Date;
  updatedAt: Date;
}

// Old ModelConfig removed - now using ModelConfig from @/lib/models/config

export interface ApiResponse {
  content?: string;
  error?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
  model?: ModelType;
  duration?: number;
}

export interface SendMessagePayload {
  model: ModelType;
  message: string;
  history: {
    role: MessageRole;
    content: string;
  }[];
}