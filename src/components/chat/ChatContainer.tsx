'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '../layout/Sidebar';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModelSelector } from './ModelSelector';
import { CostToast } from './CostToast';
import { Message, ChatSession, UsageInfo, ModelId } from '@/types';
import { DEFAULT_MODEL } from '@/lib/models/config';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client';
import { getUserChats, getChatMessages, createChat, saveMessage } from '@/app/actions/chat';

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

  const refreshChats = useCallback(async () => {
    try {
      const data = await getUserChats(userId);
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

  const handleSend = async (files?: { id: string; name: string; type: string; size: number; data: string }[]) => {
    const trimmed = input.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    let chatId = currentChatId;

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

    if (!chatId) {
      console.error('Error: chatId masih null');
      return;
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
      await saveMessage(userMessage, chatId);
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

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

      if (!res.ok) throw new Error('API error');

      const contentType = res.headers.get('Content-Type') || '';
      const isStreaming = contentType.includes('text/event-stream');

      let responseText = '';
      let usage: UsageInfo | null = null;

      if (isStreaming) {
        // Handle SSE streaming (DeepSeek & Llama)
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;

            try {
              const parsed = JSON.parse(payload);

              if (parsed.content) {
                responseText += parsed.content;
                // Update UI secara real-time saat streaming berlangsung
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: responseText }
                      : m
                  )
                );
              }

              if (parsed.usage) {
                usage = {
                  model: selectedModel,
                  inputTokens: parsed.usage.inputTokens,
                  outputTokens: parsed.usage.outputTokens,
                  costUSD: parsed.usage.costUSD,
                };
              }

              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // skip malformed SSE chunk
            }
          }
        }
      } else {
        // Handle JSON response (Claude non-streaming)
        const data = await res.json();
        responseText = data.content ?? '';
        usage = data.usage ?? null;
      }

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

      try {
        await saveMessage(assistantMessage, chatId);
        await refreshChats();
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

        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
          />
        </div>

        <div className="border-t border-white/10 p-4 bg-black/50 backdrop-blur-sm">
          <InputArea 
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>

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
