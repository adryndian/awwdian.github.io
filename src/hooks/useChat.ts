'use client';

import { useState, useCallback } from 'react';
import { DEFAULT_MODEL } from '@/lib/models/config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setModelId: (modelId: string) => void;
}

export function useChat(options?: { modelId?: string }): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelId, setModelId] = useState(options?.modelId || DEFAULT_MODEL);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    try {
      const history = messages.map((msg) => ({ role: msg.role, content: msg.content }));
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content.trim(), modelId, history }),
      });
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Request failed'); }
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [messages, modelId]);

  const clearMessages = useCallback(() => { setMessages([]); setError(null); }, []);

  return { messages, isLoading, error, sendMessage, clearMessages, setModelId };
}
