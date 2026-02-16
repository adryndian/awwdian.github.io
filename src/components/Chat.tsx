'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { InputArea } from './InputArea';
import { ModelSelector } from './ModelSelector';
import { GlassCard } from './GlassCard';
import { MessageList } from './MessageList';
import { ChatSession, Message, UploadedFile } from '@/types';
import { ModelId, DEFAULT_MODEL } from '@/lib/models';
import { invokeModel } from '@/lib/bedrock';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface ChatProps {
  userId: string;
  userEmail: string;
}

export function Chat({ userId, userEmail }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load chats from Supabase
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      toast.error('Failed to load chats');
      return;
    }

    setChats(data || []);
  };

  const saveChat = async (chatId: string, title: string, messages: Message[]) => {
    const { error } = await supabase
      .from('chats')
      .upsert({
        id: chatId,
        user_id: userId,
        title,
        messages,
        model_id: selectedModel,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to save chat:', error);
    }
  };

  const handleSend = async (files?: UploadedFile[]) => {
    if ((!input.trim() && !files?.length) || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      files,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);

    // Create new chat if needed
    let chatId = currentChatId;
    if (!chatId) {
      chatId = uuidv4();
      setCurrentChatId(chatId);
      
      // Generate title from first message
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
      await saveChat(chatId, title, newMessages);
      await loadChats();
    }

    try {
      const response = await invokeModel(
        newMessages.map(m => ({
          role: m.role,
          content: m.content,
          files: m.files,
        })),
        selectedModel
      );

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      await saveChat(chatId, chats.find(c => c.id === chatId)?.title || 'New Chat', finalMessages);
    } catch (error) {
      toast.error('Failed to get response from AI');
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInput('');
    setSidebarOpen(false);
  };

  const handleSelectChat = async (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      setSelectedModel(chat.model_id as ModelId);
      setSidebarOpen(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (error) {
      toast.error('Failed to delete chat');
      return;
    }

    if (currentChatId === chatId) {
      handleNewChat();
    }
    
    await loadChats();
    toast.success('Chat deleted');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        user={{ email: userEmail }}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <GlassCard className="mx-4 mt-4 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ModelSelector
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
            <div className="hidden sm:block text-sm text-white/60">
              {messages.length} messages
            </div>
          </div>
        </GlassCard>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
          />
        </div>

        {/* Input */}
        <div className="p-4">
          <InputArea
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            onFileUpload={(files) => handleSend(files)}
            isLoading={isLoading}
            modelId={selectedModel}
            placeholder={`Message ${selectedModel.includes('opus') ? 'Opus' : 'Sonnet'}...`}
          />
        </div>
      </div>
    </div>
  );
}
