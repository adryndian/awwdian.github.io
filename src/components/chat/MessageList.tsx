'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { MODELS } from '@/lib/models/config';
import { User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '../markdown/CodeBlock';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      <div className="w-2 h-2 rounded-full bg-white/70 dot-1" />
      <div className="w-2 h-2 rounded-full bg-white/70 dot-2" />
      <div className="w-2 h-2 rounded-full bg-white/70 dot-3" />
    </div>
  );
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // FIX SCROLL: Manual scrollTop ke container (bukan scrollIntoView ke viewport).
  // InputArea adalah `fixed bottom-0` ~140px tingginya (model pill + input + hint).
  // scrollIntoView block:'end' → scroll ke tepi viewport → pesan tertutup InputArea.
  // container.scrollTo scrollHeight → scroll ke bawah area scroll → clearance terjamin.
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  useEffect(() => {
    if (isLoading) scrollToBottom('smooth');
  }, [isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 select-none animate-fadeInUp">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-scaleIn"
          style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(31,38,135,0.3)',
          }}
        >
          <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3 drop-shadow-lg">
          Halo! Apa yang bisa saya bantu?
        </h2>
        <p className="text-base text-white/60 text-center max-w-sm">
          Pilih model AI dan mulai percakapan
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="max-w-3xl mx-auto py-6 space-y-5">
        {messages.map((message, idx) => {
          const isUser = message.role === 'user';
          const model = message.model ? MODELS[message.model] : null;
          const isStreaming = message.isStreaming;
          const hasContent = message.content && message.content.length > 0;

          return (
            <div
              key={message.id}
              className={`flex gap-3 animate-fadeInUp ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ animationDelay: `${Math.min(idx * 0.04, 0.3)}s` }}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center shrink-0 mt-1 ${
                  isUser
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30'
                    : 'glass-card'
                }`}
                style={
                  !isUser && model
                    ? { boxShadow: `0 0 0 2px ${model.color}50, 0 4px 12px rgba(0,0,0,0.3)` }
                    : {}
                }
              >
                {isUser ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: model?.color || '#a78bfa' }}
                  />
                )}
              </div>

              {/* Message column — min-w-0 wajib agar bisa menyusut */}
              <div
                className={`flex flex-col gap-1.5 min-w-0 ${
                  isUser
                    ? 'items-end max-w-[82%] sm:max-w-[75%]'
                    : 'items-start max-w-[88%] sm:max-w-[80%]'
                }`}
              >
                {/* Model label */}
                {!isUser && model && (
                  <div className="px-2">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: model.color,
                        backgroundColor: `${model.color}20`,
                        border: `1px solid ${model.color}35`,
                      }}
                    >
                      {model.name}
                    </span>
                  </div>
                )}

                {/* Bubble — overflow-hidden + min-w-0 cegah CodeBlock overflow */}
                <div
                  className={`rounded-2xl px-4 py-3 shadow-lg min-w-0 overflow-hidden w-full ${
                    isUser
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                      : 'glass-card text-white rounded-tl-sm'
                  }`}
                >
                  {/* File attachments */}
                  {message.files && message.files.length > 0 && (
                    <div className="mb-2.5 space-y-1.5 pb-2.5 border-b border-white/15">
                      {message.files.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs glass-input rounded-lg px-2.5 py-1.5"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span className="truncate text-white/85 font-medium">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isStreaming && !hasContent ? (
                    <TypingDots />
                  ) : (
                    <div className="prose-glass overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code(props) {
                            const { className, children } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            const value = String(children).replace(/\n$/, '');
                            const isInline = !className && !value.includes('\n');
                            return !isInline && match ? (
                              <CodeBlock language={match[1]} value={value} />
                            ) : (
                              <CodeBlock inline value={value} />
                            );
                          },
                          img(props) {
                            const { src, alt } = props;
                            return (
                              <div className="my-2 rounded-xl overflow-hidden border border-white/15">
                                <img
                                  src={src}
                                  alt={alt || 'Image'}
                                  className="w-full h-auto object-contain max-h-[300px]"
                                  loading="lazy"
                                />
                              </div>
                            );
                          },
                          video(props) {
                            const { src } = props;
                            return (
                              <div className="my-2 rounded-xl overflow-hidden border border-white/15">
                                <video
                                  src={src}
                                  controls
                                  className="w-full h-auto max-h-[300px]"
                                  preload="metadata"
                                />
                              </div>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      {isStreaming && hasContent && <span className="typing-cursor" />}
                    </div>
                  )}
                </div>

                {/* Token / cost info */}
                {message.tokens && !isStreaming && (
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[11px] text-white/40">
                      {message.tokens.input.toLocaleString()} in /{' '}
                      {message.tokens.output.toLocaleString()} out
                    </span>
                    {message.cost !== undefined && message.cost > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-300">
                        ${message.cost.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* FIX: paddingBottom besar agar pesan terakhir tidak tertutup InputArea.
            InputArea = model pill (~40px) + divider + input row (~60px) + hint (~24px)
            + padding top/bottom + safe-area = ~160px total.
            Tambah 24px buffer = 184px → pakai 48 (tailwind h-48 = 192px).  */}
        <div ref={bottomRef} className="h-48" aria-hidden="true" />
      </div>
    </div>
  );
}
