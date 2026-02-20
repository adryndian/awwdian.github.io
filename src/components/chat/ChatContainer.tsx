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

  // Auto-resize textarea
  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;
      setIsLoading(true);
      setError(null);
      setAiStatus('loading');
      setInputValue('');

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = '48px';
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            modelId: selectedModel,
            history,
          }),
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

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setCost(null);
    setAiStatus('idle');
  }, []);

  const currentModel = getModelConfig(selectedModel);
  const allModels = Object.values(MODELS);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* ========== HEADER with Model Selector ========== */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-sm font-bold">
            B
          </div>
          <span className="font-semibold text-sm sm:text-base">BeckRock AI</span>
          <span className="hidden sm:inline rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400 border border-green-500/30">
            Personal
          </span>
        </div>

        {/* ✅ MODEL SELECTOR - Always visible */}
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => {
              if (isValidModelId(e.target.value)) {
                setSelectedModel(e.target.value);
              }
            }}
            disabled={isLoading}
            className="w-36 sm:w-auto px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
          >
            {allModels.map((model) => (
              <option key={model.id} value={model.id} className="bg-gray-900 text-white">
                {model.name} ({model.costLevel})
              </option>
            ))}
          </select>

          <button
            onClick={handleClearChat}
            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear chat"
          >
            🗑️
          </button>
        </div>
      </header>

      {/* ========== MESSAGES AREA ========== */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-orange-500/20">
                AI
              </div>
              <h2 className="text-white/80 text-lg font-medium">
                Halo! Mulai chat dengan AI
              </h2>
              <p className="text-white/40 text-sm max-w-md">
                {currentModel.description}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {allModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={
                      'rounded-full px-3 py-1 text-xs border transition-colors ' +
                      (m.id === selectedModel
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70')
                    }
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Bubbles */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')
              }
            >
              <div
                className={
                  'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ' +
                  (msg.role === 'user'
                    ? 'bg-orange-500/20 border border-orange-500/30 text-white'
                    : 'bg-white/5 border border-white/10 text-white/90')
                }
              >
                {/* Thinking (for Opus) */}
                {msg.thinking && (
                  <details className="mb-2">
                    <summary className="text-xs text-purple-400 cursor-pointer hover:text-purple-300 transition-colors">
                      💭 View thinking process
                    </summary>
                    <div className="mt-2 text-xs text-white/50 bg-purple-500/5 rounded-lg p-3 border border-purple-500/20 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {msg.thinking}
                    </div>
                  </details>
                )}

                {/* Content */}
                <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-white/30">
                  <span>
                    {msg.timestamp.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.modelName && <span>• {msg.modelName}</span>}
                  {msg.cost != null && (
                    <span className="text-green-400/60">
                      • ${msg.cost.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 text-sm text-white/50">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>{currentModel.name} sedang berpikir...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center">
              <div className="max-w-lg px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <div className="font-medium mb-1">❌ Error</div>
                <div className="text-red-400/80 text-xs">{error}</div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ========== COST BAR ========== */}
      {cost !== null && (
        <div className="shrink-0 px-6 py-1 bg-green-500/5 border-t border-green-500/10">
          <p className="text-xs text-green-400/70 text-center">
            Last cost: ${cost.toFixed(6)} USD
          </p>
        </div>
      )}

      {/* ========== INPUT AREA - FIXED ========== */}
      <div className="shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  autoResize(e.target);
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={'Chat dengan ' + currentModel.name + '... (Enter kirim, Shift+Enter baris baru)'}
                rows={1}
                className="w-full px-4 py-3 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/30 disabled:opacity-50 transition-all"
                style={{ minHeight: '48px', maxHeight: '160px' }}
              />
            </div>
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="shrink-0 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              ) : (
                'Send'
              )}
            </button>
          </div>

          {/* Model indicator below input */}
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-[10px] text-white/20">
              Model: {currentModel.name} • {currentModel.costLevel} cost
            </span>
            <span className="text-[10px] text-white/20">
              Shift+Enter untuk baris baru
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;