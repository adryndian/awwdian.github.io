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
import { createClient } from '@/lib/supabase/client';

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
  const [chats, setChats] = useState<ChatSession[]>([]);
  const supabase = createClient();

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
    setInput('');
    setLastUsage(null);
  }, []);

  const handleSelectChat = useCallback(async (chat: ChatSession) => {
    setCurrentChatId(chat.id);
    setSelectedModel(chat.defaultModel || DEFAULT_MODEL);
    setIsLoading(true);
    try {
      const msgs = await getChatMessages(chat.id);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      // Fetch chats via API or realtime subscription
      const { data } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (data) {
        setChats(data.map(chat => ({
          id: chat.id,
          title: chat.title,
          messages: [],
          defaultModel: chat.default_model,
          createdAt: new Date(chat.created_at),
          updatedAt: new Date(chat.updated_at),
        })));
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, [userId, supabase]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

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
        await refreshChats(); // Update chat list timestamp
      } catch (e) {
        console.error('Failed to save assistant message:', e);
      }
    } catch (error) {
      console.error('Chat error:', error);
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
    <div className="flex h-full w-full bg-black text-white">
      <Sidebar 
        userId={userId}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        isLoading={isLoading}
      />
      
      <main className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <ModelSelector 
              selected={selectedModel} 
              onSelect={setSelectedModel} 
            />
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleNewChat}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              New Chat
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
          />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4 bg-black/50 backdrop-blur-sm">
          <InputArea 
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>

        {/* Cost Toast */}
        {lastUsage && (
          <CostToast 
            usage={lastUsage} 
            onClose={() => setLastUsage(null)} 
          />
        )}
      </main>
    </div>
  );
}
