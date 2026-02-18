'use client';

import { useState, useCallback } from 'react';
import { MODELS, DEFAULT_MODEL, isValidModelId } from '@/lib/models/config';
import type { ModelId } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  model?: string;
  cost?: number;
  timestamp: Date;
}

interface UseChatOptions {
  initialModel?: ModelId;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelId>(
    (options.initialModel || DEFAULT_MODEL) as ModelId
  );
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, enableThinking = false) => {
      setIsLoading(true);
      setError(null);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            modelId: currentModel,
            enableThinking: enableThinking && currentModel === 'us.anthropic.claude-opus-4-6-v1:0',
            stream: false,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get response');
        }

        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.content,
            thinking: data.thinking,
            model: data.model,
            cost: data.cost,
            timestamp: new Date(),
          },
        ]);
      } catch (err: any) {
        setError(err.message);
        console.error('[useChat] Error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, currentModel]
  );

  const clearChat = useCallback(() => { setMessages([]); setError(null); }, []);

  const changeModel = useCallback((newModelId: string) => {
    if (isValidModelId(newModelId)) setCurrentModel(newModelId as ModelId);
  }, []);

  return {
    messages,
    isLoading,
    currentModel,
    error,
    models: Object.values(MODELS),
    sendMessage,
    clearChat,
    changeModel,
    setCurrentModel: changeModel,
  };
}
