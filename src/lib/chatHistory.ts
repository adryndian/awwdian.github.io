import type { Message } from '@/types';

export interface ChatSessionData {
  id: string;
  title: string;
  model: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string;
    model?: string;
    modelName?: string;
    cost?: number;
    thinking?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'beckrock_chat_history';
const MAX_SESSIONS = 50;

function getStorage(): ChatSessionData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setStorage(sessions: ChatSessionData[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch { /* storage full */ }
}

export function getAllSessions(): ChatSessionData[] {
  return getStorage().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getSession(id: string): ChatSessionData | null {
  return getStorage().find((s) => s.id === id) || null;
}

export function createSession(model: string): ChatSessionData {
  const session: ChatSessionData = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    title: 'New Chat',
    model,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const sessions = getStorage();
  sessions.unshift(session);
  setStorage(sessions);
  return session;
}

export function updateSession(id: string, messages: Message[], model: string) {
  const sessions = getStorage();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return;

  // Generate title from first user message
  const firstUser = messages.find((m) => m.role === 'user');
  const title = firstUser ? firstUser.content.substring(0, 60) + (firstUser.content.length > 60 ? '...' : '') : 'New Chat';

  sessions[idx] = {
    ...sessions[idx],
    title,
    model,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp as unknown as string,
      model: m.model,
      modelName: m.modelName,
      cost: m.cost,
      thinking: m.thinking,
    })),
    updatedAt: new Date().toISOString(),
  };
  setStorage(sessions);
}

export function deleteSession(id: string) {
  const sessions = getStorage().filter((s) => s.id !== id);
  setStorage(sessions);
}

export function renameSession(id: string, title: string) {
  const sessions = getStorage();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx >= 0) {
    sessions[idx].title = title;
    setStorage(sessions);
  }
}

export function messagesToState(session: ChatSessionData): Message[] {
  return session.messages.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: new Date(m.timestamp),
    model: m.model,
    modelName: m.modelName,
    cost: m.cost,
    thinking: m.thinking,
  }));
}