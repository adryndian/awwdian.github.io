'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../layout/Sidebar';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModelSelector } from './ModelSelector';
import { CostToast } from './CostToast';
import { Message, ChatSession, UsageInfo, ModelId } from '@/types';
import { DEFAULT_MODEL } from '@/lib/models/config';
import { createChat, getChatMessages, saveMessage } from '@/lib/db/chat-service';
import { v4 as uuidv4 } from 'uuid';
import { Bot } from 'lucide-react';

interface ChatContainerProps {
  userId: string;
}

export function ChatContainer({ userId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
    setInput('');
  }, []);

  const handleSelectChat = useCallback(async (chat: ChatSession) => {
    setCurrentChatId(chat.id);
    setSelectedModel(chat.defaultModel || DEFAULT_MODEL);
    try {
      const msgs = await getChatMessages(chat.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  const handleSend = async (files?: { id: string; name: string; type: string; size: number; data: string }[]) => {
    const trimmed = input.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    let chatId = currentChatId;

    // Create new chat in DB if this is the first message
    if (!chatId) {
      try {
        const title = trimmed.slice(0, 50) || 'New Chat';
        chatId = await createChat(userId, title, selectedModel);
        setCurrentChatId(chatId);
      } catch (error) {
        console.error('Failed to create chat:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      files: files?.map(f => ({ name: f.name, content: f.data, extension: f.name.split('.').pop() || '' })),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Save user message to DB
    try {
      await saveMessage(userMessage, chatId);
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

    // Placeholder for streaming assistant message
    const assistantId = uuidv4();
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.files?.length
              ? `${m.content}\n\n[Attached files]\n${m.files.map(f => `### ${f.name}\n${f.content}`).join('\n\n')}`
              : m.content,
          })),
          model: selectedModel,
          chatId,
        }),
      });

      if (!res.ok) {
        throw new Error('API error');
      }

      const data = await res.json();
      const responseText: string = data.content ?? '';
      const usage: UsageInfo | null = data.usage ?? null;

      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        model: selectedModel,
        isStreaming: false,
        tokens: usage ? { input: usage.inputTokens, output: usage.outputTokens } : undefined,
        cost: usage?.costUSD,
      };

      setMessages(prev => prev.map(m => m.id === assistantId ? assistantMessage : m));
      if (usage) setLastUsage(usage);

      // Save assistant message to DB
      try {
        await saveMessage(assistantMessage, chatId);
      } catch (e) {
        console.error('Failed to save assistant message:', e);
      }
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'Sorry, an error occurred. Please try again.', isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        userId={userId}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onChatDeleted={handleNewChat}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">Claude Bedrock Chat</span>
          </div>
          <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <MessageList messages={messages} isStreaming={isLoading} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-white/10">
          <InputArea
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Cost Toast */}
      <CostToast usage={lastUsage} onClose={() => setLastUsage(null)} />
    </div>
  );
}
