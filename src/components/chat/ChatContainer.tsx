'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '../layout/Sidebar';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { CostToast } from './CostToast';
import { Message, ChatSession, UsageInfo, ModelId } from '@/types';
import { DEFAULT_MODEL } from '@/lib/models/config';
import { v4 as uuidv4 } from 'uuid';
import { getUserChats, getChatMessages, createChat, saveMessage } from '@/app/actions/chat';
import { posthog } from '@/lib/posthog';
import { createClient } from '@/lib/supabase/client';

interface ChatContainerProps { userId: string; }

interface PendingFile {
  id: string; name: string; type: string; size: number; data: string;
}

export function ChatContainer({ userId }: ChatContainerProps) {
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [selectedModel,  setSelectedModel]  = useState<ModelId>(DEFAULT_MODEL);
  const [currentChatId,  setCurrentChatId]  = useState<string | null>(null);
  const [lastUsage,      setLastUsage]      = useState<UsageInfo | null>(null);
  const [chats,          setChats]          = useState<ChatSession[]>([]);
  const [pendingFiles,   setPendingFiles]   = useState<PendingFile[]>([]);
  const [chatsLoading,   setChatsLoading]   = useState(false);

  const refreshChats = useCallback(async () => {
    setChatsLoading(true);
    try {
      const data = await getUserChats(userId);
      setChats(
        data.map((c: any) => ({
          id: c.id,
          title: c.title,
          messages: [],
          defaultModel: c.default_model,
          createdAt: new Date(c.created_at),
          updatedAt: new Date(c.updated_at),
        }))
      );
    } catch (err) {
      console.error('Failed to load chats:', err);
      posthog.capture('chats_load_error', { error: String(err) });
    } finally {
      setChatsLoading(false);
    }
  }, [userId]);

  const handleNewChat = useCallback(() => {
    posthog.capture('new_chat_clicked', { previousChatId: currentChatId });
    setMessages([]);
    setCurrentChatId(null);
    setInput('');
    setLastUsage(null);
    setPendingFiles([]);
  }, [currentChatId]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    posthog.capture('chat_delete_initiated', { chatId });
    if (currentChatId === chatId) {
      setMessages([]); setCurrentChatId(null); setInput(''); setLastUsage(null); setPendingFiles([]);
    }
    try {
      const supabase = createClient();
      const { error: msgErr } = await supabase.from('messages').delete().eq('chat_id', chatId);
      if (msgErr) throw msgErr;
      const { error: chatErr } = await supabase.from('chats').delete().eq('id', chatId);
      if (chatErr) throw chatErr;
      posthog.capture('chat_deleted_success', { chatId });
      await refreshChats();
    } catch (err) {
      console.error('Delete chat error:', err);
      posthog.capture('chat_deleted_error', { chatId, error: String(err) });
      throw err;
    }
  }, [currentChatId, refreshChats]);

  const handleSelectChat = useCallback(async (chat: ChatSession) => {
    posthog.capture('chat_selected', { chatId: chat.id, model: chat.defaultModel });
    setCurrentChatId(chat.id);
    setSelectedModel((chat.defaultModel || DEFAULT_MODEL) as ModelId);
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
    } catch (err) {
      console.error('Load messages error:', err);
      posthog.capture('messages_load_error', { chatId: chat.id, error: String(err) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = async (files?: PendingFile[]) => {
    const trimmed = input.trim();
    if (!trimmed && (!files || files.length === 0)) return;

    const t0 = Date.now();
    posthog.capture('message_sent', {
      model: selectedModel,
      messageLength: trimmed.length,
      hasAttachments: !!(files?.length),
      isNewChat: !currentChatId,
    });

    let chatId = currentChatId;

    if (!chatId) {
      try {
        const title = trimmed.slice(0, 60) || 'Chat Baru';
        chatId = await createChat(userId, title, selectedModel);
        setCurrentChatId(chatId);
        posthog.capture('chat_created', { chatId, model: selectedModel });
        await refreshChats();
      } catch (err) {
        console.error('Create chat error:', err);
        posthog.capture('chat_creation_error', { error: String(err) });
        return;
      }
    }

    if (!chatId) return;

    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      files: files?.map((f) => ({ name: f.name, content: f.data, extension: f.name.split('.').pop() || '' })),
    };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setPendingFiles([]);
    setIsLoading(true);

    try { await saveMessage(userMsg, chatId); }
    catch (e) { console.error('Save user msg failed:', e); }

    const aId = uuidv4();
    setMessages((p) => [...p, {
      id: aId, role: 'assistant', content: '', timestamp: new Date(),
      model: selectedModel, isStreaming: true,
    }]);

    const apiMessages = [...messages, userMsg]
      .filter((m) => m.content?.trim().length > 0)
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
        body: JSON.stringify({ messages: apiMessages, model: selectedModel }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'API error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const isStreaming = res.headers.get('Content-Type')?.includes('text/event-stream');
      let responseText = '';
      let usage: UsageInfo | null = null;
      let firstChunk: number | null = null;
      let chunkCount = 0;

      if (isStreaming) {
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buf = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                if (firstChunk === null) {
                  firstChunk = Date.now();
                  posthog.capture('first_chunk_received', {
                    model: selectedModel, ttfb: firstChunk - t0,
                  });
                }
                chunkCount++;
                responseText += parsed.content;
                setMessages((p) =>
                  p.map((m) => m.id === aId ? { ...m, content: responseText, isStreaming: true } : m)
                );
              }
              if (parsed.usage) {
                usage = { model: selectedModel, ...parsed.usage };
              }
            } catch { /* skip malformed */ }
          }
        }
      } else {
        const data = await res.json();
        responseText = data.content ?? '';
        if (data.usage) usage = { model: selectedModel, ...data.usage };
      }

      const finalMsg: Message = {
        id: aId, role: 'assistant',
        content: responseText || '*(Tidak ada respons)*',
        timestamp: new Date(), model: selectedModel, isStreaming: false,
        tokens: usage ? { input: usage.inputTokens, output: usage.outputTokens } : undefined,
        cost: usage?.costUSD,
      };
      setMessages((p) => p.map((m) => m.id === aId ? finalMsg : m));
      if (usage) setLastUsage(usage);

      posthog.capture('response_received', {
        model: selectedModel, isStreaming,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        cost: usage?.costUSD ?? 0,
        responseLength: responseText.length,
        duration: Date.now() - t0,
        ttfb: firstChunk ? firstChunk - t0 : Date.now() - t0,
        chunkCount,
      });

      if (responseText.trim()) {
        try { await saveMessage(finalMsg, chatId); await refreshChats(); }
        catch (e) { console.error('Save assistant msg failed:', e); }
      }

    } catch (err) {
      console.error('Chat error:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      posthog.capture('chat_error', { model: selectedModel, error: msg });
      setMessages((p) =>
        p.map((m) => m.id === aId
          ? { ...m, content: `Maaf, terjadi kesalahan: ${msg}. Silakan coba lagi.`, isStreaming: false }
          : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (modelId: ModelId) => {
    setSelectedModel(modelId);
    if (messages.length > 0) {
      posthog.capture('model_changed_mid_conversation', {
        newModel: modelId, messageCount: messages.length, chatId: currentChatId,
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
        isLoading={chatsLoading}
      />

      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* HEADER: hanya branding + hamburger spacer di mobile.
            ModelSelector sudah dipindah ke InputArea. */}
        <header className="h-14 sm:h-16 glass-dark border-b border-white/8 flex items-center px-4 lg:px-5 shrink-0 z-20">
          {/* Spacer kiri untuk hamburger mobile button (dari Sidebar.tsx) */}
          <div className="w-10 shrink-0 lg:hidden" />

          {/* App title — center di mobile, left di desktop */}
          <div className="flex-1 flex items-center justify-center lg:justify-start">
            <span className="text-sm font-semibold text-white/70 tracking-wide">
              BeckRock AI
            </span>
          </div>
        </header>

        {/* MESSAGES: overflow handled inside MessageList */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <MessageList messages={messages} isLoading={isLoading} />
        </div>

        {/* INPUT AREA: fixed bottom, includes ModelSelector + larger send button */}
        <InputArea
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isLoading={isLoading}
          disabled={isLoading}
          pendingFiles={pendingFiles}
          onAddFiles={(f) => setPendingFiles((p) => [...p, ...f])}
          onRemoveFile={(id) => setPendingFiles((p) => p.filter((f) => f.id !== id))}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
      </main>

      {lastUsage && (
        <CostToast usage={lastUsage} onClose={() => setLastUsage(null)} />
      )}
    </div>
  );
}
