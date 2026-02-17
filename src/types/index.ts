export type ModelId = 
  | 'claude-sonnet-4-5' 
  | 'claude-opus-4-6' 
  | 'deepseek-r1'
  | 'llama-4-maverick';

export interface ModelConfig {
  id: ModelId;
  name: string;
  description: string;
  bedrockId: string;
  region: string;
  supportsStreaming: boolean;
  inputPricePer1K: number;
  outputPricePer1K: number;
  color: string;
  icon: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: ModelId;
  tokens?: {
    input: number;
    output: number;
  };
  cost?: number;
  isStreaming?: boolean;
  files?: ExtractedFile[];
}

export interface ExtractedFile {
  name: string;
  content: string;
  extension: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  defaultModel: ModelId;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageInfo {
  model: ModelId;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}
