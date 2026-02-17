// src/types/index.ts

export type ModelType = "claude" | "llama" | "deepseek";

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

export interface ModelConfig {
  id: ModelType;
  name: string;
  description: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  available: boolean;
}

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