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
    <div className="flex items-center gap-1.5 px-2 py-1">
      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 dot-1" />
      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 dot-2" />
      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 dot-3" />
    </div>
  );
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 select-none animate-fadeInUp">
        <div className="glass-card w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-scaleIn shadow-[var(--shadow-elevated)]">
          <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3 drop-shadow-md">
          Halo! Apa yang bisa saya bantu?
        </h2>
        <p className="text-base text-white/70 text-center max-w-md drop-shadow">
          Pilih model AI dan mulai percakapan
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="max-w-4xl mx-auto py-6 space-y-5">
        {messages.map((message, idx) => {
          const isUser = message.role === 'user';
          const model = message.model ? MODELS[message.model] : null;
          const isStreaming = message.isStreaming;
          const hasContent = message.content && message.content.length > 0;

          return (
            <div
              key={message.id}
              className={`flex gap-3 sm:gap-4 animate-fadeInUp ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 mt-1 shadow-lg ${
                  isUser
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                    : 'glass-card'
                }`}
                style={
                  !isUser && model
                    ? {
                        boxShadow: `0 0 0 3px ${model.color}40, 0 8px 16px rgba(0,0,0,0.2)`,
                      }
                    : {}
                }
              >
                {isUser ? (
                  <User className="w-5 h-5 text-white drop-shadow" />
                ) : (
                  <div
                    className="w-4 h-4 rounded-full shadow-inner"
                    style={{ backgroundColor: model?.color || '#8b5cf6' }}
                  />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`flex flex-col gap-1.5 max-w-[85%] sm:max-w-[80%] lg:max-w-[75%] ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                {/* Model label */}
                {!isUser && model && (
                  <div className="flex items-center gap-1.5 px-1.5">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: model.color,
                        backgroundColor: `${model.color}15`,
                        border: `1px solid ${model.color}30`,
                      }}
                    >
                      {model.name}
                    </span>
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-3 py-2.5 sm:px-3.5 sm:py-3 shadow-sm transition-smooth ${
                    isUser
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm'
                      : 'glass-card text-gray-900 rounded-tl-sm'
                  }`}
                >
                  {/* Attached files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mb-2 space-y-1.5">
                      {message.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="glass-input rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs"
                        >
                          <div className="w-1 h-1 rounded-full bg-purple-400 shadow-sm" />
                          <span className="truncate font-medium text-gray-700">
                            {file.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  {isStreaming && !hasContent ? (
                    <TypingDots />
                  ) : (
                    <div className="prose-glass">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code(props) {
                            const { className, children, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            const value = String(children).replace(/\n$/, '');
                            // Check if it's an inline code or block code
                            const isInline = !className && !value.includes('\n');
                            return !isInline && match ? (
                              <CodeBlock language={match[1]} value={value} />
                            ) : (
                              <CodeBlock inline value={value} />
                            );
                          },
                          img(props) {
                            const { src, alt, ...rest } = props;
                            return (
                              <div className="my-2 rounded-lg overflow-hidden border border-purple-200 shadow-sm w-full">
                                <img
                                  src={src}
                                  alt={alt || 'Image'}
                                  className="w-full h-auto object-contain max-h-[300px] bg-purple-50"
                                  loading="lazy"
                                  {...rest}
                                />
                                {alt && (
                                  <div className="px-2.5 py-1.5 text-[10px] text-gray-600 bg-purple-50/50 border-t border-purple-100">
                                    {alt}
                                  </div>
                                )}
                              </div>
                            );
                          },
                          video(props) {
                            const { src, ...rest } = props;
                            return (
                              <div className="my-2 rounded-lg overflow-hidden border border-purple-200 shadow-sm w-full">
                                <video
                                  src={src}
                                  controls
                                  className="w-full h-auto max-h-[300px] bg-purple-50"
                                  preload="metadata"
                                  {...rest}
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

                {/* Token info */}
                {message.tokens && !isStreaming && (
                  <div className="flex items-center gap-2.5 px-2">
                    <span className="text-[11px] text-white/50 drop-shadow-sm">
                      {message.tokens.input.toLocaleString()} in /{' '}
                      {message.tokens.output.toLocaleString()} out
                    </span>
                    {message.cost !== undefined && message.cost > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-300 drop-shadow-sm">
                        ${message.cost.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
