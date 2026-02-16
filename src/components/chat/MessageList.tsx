'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { MODELS } from '@/lib/models/config';
import { User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <div className="w-2 h-2 rounded-full bg-gray-400 dot-1" />
      <div className="w-2 h-2 rounded-full bg-gray-400 dot-2" />
      <div className="w-2 h-2 rounded-full bg-gray-400 dot-3" />
    </div>
  );
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 select-none">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Apa yang bisa saya bantu?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] text-center max-w-xs">
          Mulai percakapan dengan pilih model AI dan kirim pesan
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const model = message.model ? MODELS[message.model] : null;
          const isStreaming = message.isStreaming;
          const hasContent = message.content && message.content.length > 0;

          return (
            <div
              key={message.id}
              className={`flex gap-3 message-enter ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isUser
                    ? 'bg-[var(--accent-blue)]'
                    : 'bg-white border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]'
                }`}
                style={!isUser && model ? { boxShadow: `0 0 0 2px ${model.color}20` } : {}}
              >
                {isUser ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: model?.color || '#6B7280' }}
                  />
                )}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Model label */}
                {!isUser && model && (
                  <span
                    className="text-xs font-medium px-1"
                    style={{ color: model.color }}
                  >
                    {model.name}
                  </span>
                )}

                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-[var(--accent-blue)] text-white rounded-tr-sm'
                      : 'bg-white border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm shadow-[var(--shadow-sm)]'
                  }`}
                >
                  {/* Attached files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {message.files.map((file, idx) => (
                        <div
                          key={idx}
                          className={`text-xs rounded-lg px-2 py-1.5 flex items-center gap-2 ${
                            isUser ? 'bg-white/20' : 'bg-gray-100'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${isUser ? 'bg-white' : 'bg-gray-400'}`} />
                          <span className="truncate font-medium">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  {isStreaming && !hasContent ? (
                    <TypingDots />
                  ) : (
                    <div className={isUser ? 'prose-chat-user' : 'prose-chat'}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                      {isStreaming && hasContent && (
                        <span className="typing-cursor" />
                      )}
                    </div>
                  )}
                </div>

                {/* Token info */}
                {message.tokens && !isStreaming && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {message.tokens.input.toLocaleString()} in / {message.tokens.output.toLocaleString()} out
                    </span>
                    {message.cost !== undefined && message.cost > 0 && (
                      <span className="text-[11px] text-emerald-600 font-medium">
                        ${message.cost.toFixed(4)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
