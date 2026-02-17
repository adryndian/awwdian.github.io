'use client';
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
import { getUserChats, getChatMessages, createChat, saveMessage } from '@/app/actions/chat';
import { posthog } from '@/lib/posthog';
import { createClient } from '@/lib/supabase/client';

interface ChatContainerProps {
  userId: string;
}

interface PendingFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
}

export function ChatContainer({ userId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const refreshChats = useCallback(async () => {
    try {
      const data = await getUserChats(userId);
      setChats(
        data.map((chat: any) => ({
          id: chat.id,
          title: chat.title,
          messages: [],
          defaultModel: chat.default_model,
          createdAt: new Date(chat.created_at),
          updatedAt: new Date(chat.updated_at),
        }))
      );
    } catch (error) {
      console.error('Failed to load chats:', error);
      
      // 📊 Track error
      posthog.capture('chats_load_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }, [userId]);

  const handleNewChat = useCallback(() => {
    // 📊 Track new chat button clicked
    posthog.capture('new_chat_clicked', {
      previousChatId: currentChatId,
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
    });

    setMessages([]);
    setCurrentChatId(null);
    setInput('');
    setLastUsage(null);
    setPendingFiles([]);
  }, [currentChatId, messages.length]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    // 📊 Track chat deletion
    posthog.capture('chat_delete_initiated', {
      chatId,
      timestamp: new Date().toISOString(),
    });

    // Optimistic update - immediately remove from UI
    setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));

    // If deleting current chat, reset to new chat
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId(null);
      setInput('');
      setLastUsage(null);
      setPendingFiles([]);
    }

    try {
      const supabase = createClient();

      // Delete messages first (foreign key constraint)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId);

      if (messagesError) {
        throw messagesError;
      }

      // Delete the chat
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) {
        throw chatError;
      }

      // 📊 Track successful deletion
      posthog.capture('chat_deleted_success', {
        chatId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to delete chat:', error);

      // 📊 Track deletion error
      posthog.capture('chat_deleted_error', {
        chatId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      // Rollback optimistic update by refetching
      await refreshChats();

      alert('Gagal menghapus percakapan. Silakan coba lagi.');
    }
  }, [currentChatId, refreshChats]);

  const handleSelectChat = useCallback(async (chat: ChatSession) => {
    // 📊 Track chat selection
    posthog.capture('chat_selected', {
      chatId: chat.id,
      chatTitle: chat.title,
      chatModel: chat.defaultModel,
      chatAge: Date.now() - chat.createdAt.getTime(),
      timestamp: new Date().toISOString(),
    });

    setCurrentChatId(chat.id);
    setSelectedModel(chat.defaultModel || DEFAULT_MODEL);
    setIsLoading(true);
    
    try {
      const msgs = await getChatMessages(chat.id);
      setMessages(
        msgs.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          model: m.model,
          tokens: m.input_tokens ? { input: m.input_tokens, output: m.output_tokens } : undefined,
          cost: m.cost_usd,
          files: m.files || [],
        }))
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
      
      // 📊 Track error
      posthog.capture('messages_load_error', {
        chatId: chat.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = async (files?: PendingFile[]) => {
    const trimmed = input.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    const messageStartTime = Date.now();

    // 📊 Track message sent (before API call)
    posthog.capture('message_sent', {
      model: selectedModel,
      messageLength: trimmed.length,
      wordCount: trimmed.split(/\s+/).length,
      hasAttachments: files && files.length > 0,
      attachmentCount: files?.length || 0,
      isNewChat: !currentChatId,
      timestamp: new Date().toISOString(),
    });

    let chatId = currentChatId;

    if (!chatId) {
      try {
        const title = trimmed.slice(0, 60) || 'Chat Baru';
        chatId = await createChat(userId, title, selectedModel);
        setCurrentChatId(chatId);
        await refreshChats();

        // 📊 Track chat created
        posthog.capture('chat_created', {
          chatId,
          firstModel: selectedModel,
          firstMessageLength: trimmed.length,
          hasAttachments: files && files.length > 0,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to create chat:', error);
        
        // 📊 Track error
        posthog.capture('chat_creation_error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        
        return;
      }
    }

    if (!chatId) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      files: files?.map((f) => ({
        name: f.name,
        content: f.data,
        extension: f.name.split('.').pop() || '',
      })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPendingFiles([]);
    setIsLoading(true);

    // Save user message
    try {
      await saveMessage(userMessage, chatId);
    } catch (e) {
      console.error('Failed to save user message:', e);
    }

    // Placeholder untuk assistant
    const assistantId = uuidv4();
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    // Bangun messages untuk API - FILTER EMPTY
    const apiMessages = [...messages, userMessage]
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role,
        content: m.files?.length
          ? `${m.content}\n\n[Lampiran]\n${m.files.map((f) => `### ${f.name}\n${f.content}`).join('\n\n')}`
          : m.content,
      }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          chatId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'API error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get('Content-Type') || '';
      const isStreaming = contentType.includes('text/event-stream');

      let responseText = '';
      let usage: UsageInfo | null = null;
      let firstChunkTime: number | null = null;
      let chunkCount = 0;

      if (isStreaming) {
        // === Handle SSE Streaming (DeepSeek & Llama) ===
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

              if (parsed.error) throw new Error(parsed.error);

              if (parsed.content) {
                if (firstChunkTime === null) {
                  firstChunkTime = Date.now();
                  
                  // 📊 Track first chunk received (TTFB)
                  posthog.capture('first_chunk_received', {
                    model: selectedModel,
                    ttfb: firstChunkTime - messageStartTime,
                    timestamp: new Date().toISOString(),
                  });
                }
                
                chunkCount++;
                responseText += parsed.content;
                
                // Update bubble secara real-time
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: responseText, isStreaming: true }
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
            } catch (parseErr) {
              // skip malformed chunk
            }
          }
        }
      } else {
        // === Handle JSON Response (Claude non-streaming) ===
        const data = await res.json();
        responseText = data.content ?? '';
        usage = data.usage ?? null;
      }

      const responseEndTime = Date.now();
      const totalDuration = responseEndTime - messageStartTime;

      // Finalize message
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: responseText || '*(Tidak ada respons)*',
        timestamp: new Date(),
        model: selectedModel,
        isStreaming: false,
        tokens: usage ? { input: usage.inputTokens, output: usage.outputTokens } : undefined,
        cost: usage?.costUSD,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? assistantMessage : m))
      );

      if (usage) setLastUsage(usage);

      // 📊 Track response received (success)
      posthog.capture('response_received', {
        model: selectedModel,
        isStreaming,
        inputTokens: usage?.inputTokens || 0,
        outputTokens: usage?.outputTokens || 0,
        cost: usage?.costUSD || 0,
        responseLength: responseText.length,
        wordCount: responseText.split(/\s+/).length,
        duration: totalDuration,
        ttfb: firstChunkTime ? firstChunkTime - messageStartTime : totalDuration,
        chunkCount: isStreaming ? chunkCount : 1,
        averageChunkSize: isStreaming && chunkCount > 0 ? responseText.length / chunkCount : 0,
        timestamp: new Date().toISOString(),
      });

      // Simpan ke Supabase HANYA jika ada konten
      if (responseText && responseText.trim().length > 0) {
        try {
          await saveMessage(assistantMessage, chatId);
          await refreshChats();
        } catch (e) {
          console.error('Failed to save assistant message:', e);
          
          // 📊 Track save error
          posthog.capture('message_save_error', {
            messageRole: 'assistant',
            error: e instanceof Error ? e.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      const errorTime = Date.now();
      const errorDuration = errorTime - messageStartTime;
      
      console.error('Chat error:', error);
      const errMsg = error instanceof Error ? error.message : 'Terjadi error';

      // 📊 Track chat error
      posthog.capture('chat_error', {
        model: selectedModel,
        error: errMsg,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        duration: errorDuration,
        messageLength: trimmed.length,
        hasAttachments: files && files.length > 0,
        timestamp: new Date().toISOString(),
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Maaf, terjadi kesalahan: ${errMsg}. Silakan coba lagi.`,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 📊 Track model change from ChatContainer
  const handleModelChange = (modelId: ModelId) => {
    setSelectedModel(modelId);
    
    // Additional tracking if needed (already tracked in ModelSelector)
    if (messages.length > 0) {
      posthog.capture('model_changed_mid_conversation', {
        newModel: modelId,
        messageCount: messages.length,
        chatId: currentChatId,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        userId={userId}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        isLoading={false}
      />

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-purple-100 glass-dark flex items-center justify-between px-3 lg:px-4 shrink-0 z-20">
          <div className="flex items-center gap-2 pl-12 lg:pl-0">
            <ModelSelector
              selected={selectedModel}
              onSelect={handleModelChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicator */}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600 glass-input px-2.5 py-1 rounded-full">
                <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse shadow-sm shadow-purple-400" />
                <span className="hidden sm:inline font-medium">Generating...</span>
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 pb-28 sm:pb-32">
          <MessageList messages={messages} isLoading={isLoading} />
        </div>

        {/* Input - floating fixed */}
        <InputArea
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isLoading={isLoading}
          disabled={isLoading}
          pendingFiles={pendingFiles}
          onAddFiles={(files) => setPendingFiles((prev) => [...prev, ...files])}
          onRemoveFile={(id) => setPendingFiles((prev) => prev.filter((f) => f.id !== id))}
        />
      </main>

      {/* Cost Toast */}
      {lastUsage && <CostToast usage={lastUsage} onClose={() => setLastUsage(null)} />}
    </div>
  );
}
