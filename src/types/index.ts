export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
  isStreaming?: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  preview?: string; // for images
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}
