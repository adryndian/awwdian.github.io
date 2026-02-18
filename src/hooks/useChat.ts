'use client';

import { useState, useCallback } from 'react';
// Import dari config.ts langsung
import { MODELS, DEFAULT_MODEL, type ModelId, isValidModelId } from '@/lib/models/config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  model?: string;
}

interface UseChatOptions {
  initialModel?: ModelId;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fix: Explicit type <ModelId> pada useState
  const [currentModel, setCurrentModel] = useState<ModelId>(
    options.initialModel || DEFAULT_MODEL
  );
  
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string, enableThinking = false) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          modelId: currentModel,
          enableThinking: enableThinking && currentModel === 'us.anthropic.claude-opus-4-6-v1',
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        thinking: data.thinking,
        model: data.model,
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err: any) {
      setError(err.message);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentModel]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Handler untuk ganti model dengan validasi
  const changeModel = useCallback((newModelId: string) => {
    if (isValidModelId(newModelId)) {
      setCurrentModel(newModelId);
      return true;
    } else {
      console.error(`Invalid model ID: ${newModelId}`);
      return false;
    }
  }, []);

  return {
    messages,
    isLoading,
    currentModel,
    setCurrentModel: changeModel, // Gunakan wrapper yang type-safe
    error,
    sendMessage,
    clearChat,
    availableModels: Object.values(MODELS),
  };
}
