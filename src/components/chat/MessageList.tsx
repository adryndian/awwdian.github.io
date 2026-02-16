'use client';

import { Message } from '@/types';
import { MODELS } from '@/lib/models/config';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// TAMBAHKAN INTERFACE INI
interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-white/40">
          <Bot className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Mulai percakapan baru</p>
          <p className="text-sm">Ketik pesan untuk memulai chat dengan AI</p>
        </div>
      )}

      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const isStreaming = message.isStreaming;
        const model = message.model ? MODELS[message.model] : null;

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                isUser ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              {isUser ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>

            {/* Content */}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-gray-800 text-white rounded-bl-none'
              }`}
            >
              {/* Model badge untuk assistant */}
              {model && !isUser && (
                <div className="text-xs text-white/60 mb-1 flex items-center gap-1">
                  <span style={{ color: model.color }}>●</span>
                  {model.name}
                </div>
              )}

              {/* Attached files */}
              {message.files && message.files.length > 0 && (
                <div className="mb-2 space-y-1">
                  {message.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-black/20 rounded px-2 py-1 flex items-center gap-1"
                    >
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message content */}
              {isStreaming && !message.content ? (
                <div className="flex items-center gap-2 text-white/60">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200" />
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}

              {/* Token & Cost info */}
              {message.tokens && (
                <div className="mt-2 text-xs text-white/40 flex items-center gap-2">
                  <span>{message.tokens.input} in / {message.tokens.output} out</span>
                  {message.cost && (
                    <span className="text-green-400">${message.cost.toFixed(4)}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loading indicator untuk assistant */}
      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200" />
          </div>
        </div>
      )}
    </div>
  );
}
