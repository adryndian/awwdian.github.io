'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../layout/Sidebar';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModelSelector } from './ModelSelector';
import { CostToast } from './CostToast';
import { Message, ChatSession, UsageInfo, ModelId } from '@/types';
import { DEFAULT_MODEL } from '@/lib/models/config';
import { 
  getUserChats, 
  getChatMessages, 
  createChat, 
  saveMessage 
} from '@/app/actions/chat'; // ← Ganti ke Server Actions
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client'; // Hanya untuk auth/listener

export function ChatContainer({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const supabase = createClient();

  const refreshChats = useCallback(async () => {
    try {
      const data = await getUserChats(userId); // ← Server Action
      setChats(data.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        messages: [],
        defaultModel: chat.default_model,
        createdAt: new Date(chat.created_at),
        updatedAt: new Date(chat.updated_at),
      })));
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, [userId]);

  const handleSelectChat = useCallback(async (chat: ChatSession) => {
    setCurrentChatId(chat.id);
    setSelectedModel(chat.defaultModel || DEFAULT_MODEL);
    setIsLoading(true);
    try {
      const msgs = await getChatMessages(chat.id); // ← Server Action
      setMessages(msgs.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
        model: m.model,
        tokens: m.input_tokens ? { input: m.input_tokens, output: m.output_tokens } : undefined,
        cost: m.cost_usd,
        files: m.files || [],
      })));
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = async (files?: any[]) => {
    const trimmed = input.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    let chatId = currentChatId;

    if (!chatId) {
      try {
        const title = trimmed.slice(0, 50) || 'New Chat';
        chatId = await createChat(userId, title, selectedModel); // ← Server Action
        setCurrentChatId(chatId);
        await refreshChats();
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
      files: files?.map(f => ({ 
        name: f.name, 
        content: f.data, 
        extension: f.name.split('.').pop() || '' 
      })),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      await saveMessage(userMessage, chatId); // ← Server Action
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

    // ... rest tetap sama (API call ke /api/chat)
  };

  // ... useEffect dan return JSX tetap sama
}
