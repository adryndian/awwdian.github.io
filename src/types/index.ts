// src/types/index.ts

// Re-export types dari config.ts (hapus definisi ModelId manual sebelumnya)
export type { ModelId } from '@/lib/models/config';
export { MODELS, DEFAULT_MODEL, AWS_REGION, isValidModelId, getModelConfig } from '@/lib/models/config';

export type ExtractedFile = {
  name: string;
  extension: string;
  content: string;
};

// Hapus definisi ModelId yang lama (yang pakai union string manual)
// Karena sekarang di-export dari config.ts

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: string; // Bisa juga pakai ModelId jika perlu
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
  model: string; // atau ModelId jika strict
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
  model: string; // atau ModelId
  message: string;
  history: {
    role: MessageRole;
    content: string;
  }[];
}
