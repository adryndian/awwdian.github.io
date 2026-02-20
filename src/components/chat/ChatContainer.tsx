'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DEFAULT_MODEL, isValidModelId, MODELS, getModelConfig } from '@/lib/models/config';
import type { Message, AiStatus } from '@/types';

interface ChatContainerProps {
  userId?: string;
  initialModel?: string;
}

export function ChatContainer({ initialModel }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    isValidModelId(initialModel || '') ? initialModel! : DEFAULT_MODEL
  );
  const [cost, setCost] = useState<number | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;
      setIsLoading(true);
      setError(null);
      setAiStatus('loading');
      setInputValue('');

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content.trim(), modelId: selectedModel, history }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server error');
        if (!data.message) throw new Error('Empty response.');

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date(),
            model: data.model || selectedModel,
            modelName: data.modelName,
            thinking: data.thinking,
            cost: data.cost,
          },
        ]);
        setCost(data.cost ?? null);
        setAiStatus('idle');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setAiStatus('error');
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, selectedModel, isLoading]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(inputValue);
      }
    },
    [inputValue, handleSendMessage]
  );

  const currentModel = getModelConfig(selectedModel);
  const allModels = Object.values(MODELS);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-sm font-bold">B</div>
          <span className="font-semibold">BeckRock AI</span>
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400 border border-green-500/30">Personal</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => { if (isValidModelId(e.target.value)) setSelectedModel(e.target.value); }}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            {allModels.map((model) => (
              <option key={model.id} value={model.id} className="bg-gray-900">
                {model.name} ({model.costLevel})
              </option>
            ))}
          </select>
          <button onClick={() => { setMessages([]); setError(null); setCost(null); }} className="px-3 py-1.5 text-sm rounded-lg text-white/50 hover:text-white hover:bg-white/10">Clear</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-2xl font-bold">AI</div>
            <p className="text-white/70 text-lg font-medium">Halo! Pilih model dan mulai chat</p>
            <p className="text-white/40 text-sm max-w-md">{currentModel.description}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {allModels.map((m) => (
                <span key={m.id} className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/50">{m.name}</span>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={'max-w-[80%] rounded-2xl px-4 py-3 ' + (msg.role === 'user' ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-white/5 border border-white/10 text-white/90')}>
              {msg.thinking && (
                <details className="mb-2">
                  <summary className="text-xs text-purple-400 cursor-pointer">💭 View thinking</summary>
                  <div className="mt-2 text-xs text-white/50 bg-purple-500/5 rounded-lg p-2 border border-purple-500/20 font-mono whitespace-pre-wrap">{msg.thinking}</div>
                </details>
              )}
              <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-white/30">
                <span>{msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.modelName && <span>• {msg.modelName}</span>}
                {msg.cost != null && <span className="text-green-400/60">• ${msg.cost.toFixed(4)}</span>}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-white/50">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {currentModel.name} sedang berpikir...
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="max-w-lg px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">❌ {error}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {cost !== null && (
        <div className="px-6 py-1.5 bg-green-500/5 border-t border-green-500/10">
          <p className="text-xs text-green-400/70 text-center">Last cost: ${cost.toFixed(6)} USD</p>
        </div>
      )}

      <div className="px-4 py-4 border-t border-white/10 bg-gray-900/30">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={'Chat dengan ' + currentModel.name + '... (Enter kirim)'}
            rows={1}
            className="flex-1 px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 max-h-40"
            style={{ minHeight: '48px' }}
            onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 160) + 'px'; }}
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
            className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '⏳' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;