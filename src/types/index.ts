// src/types/index.ts

export type ExtractedFile = {
  name: string;
  extension: string;
  content: string;
};

export type ModelType = "claude" | "llama" | "deepseek";

// Re-export types from lib/models/config
export type { ModelId, ModelConfig } from "@/lib/models/config";

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