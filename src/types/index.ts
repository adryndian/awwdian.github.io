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
}