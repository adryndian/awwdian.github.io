'use client';

import { motion } from 'framer-motion';
import { User, Bot, FileText } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { Message } from '@/types';
import { MODELS } from '@/lib/models/config';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-2xl">
          <Bot className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">How can I help you today?</h2>
          <p className="text-white/60">Start a conversation or upload files to analyze</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={cn('flex gap-4', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
        >
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg',
            message.role === 'user' ? 'bg-[#007AFF]' : 'bg-gradient-to-br from-[#5856D6] to-[#AF52DE]'
          )}>
            {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
          </div>

          <div className={cn('flex-1 max-w-[80%]', message.role === 'user' ? 'items-end' : 'items-start')}>
            <GlassCard className={cn('relative overflow-hidden', isUser ? 'bg-[#007AFF]/20' : 'bg-white/10')}>
              {model && !isUser && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-medium text-white/80">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: model.color }} />
                  {model.name}
                </div>
              )}

              {message.files && message.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {message.files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 text-xs text-white/80">
                      <FileText className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="prose prose-invert prose-sm max-w-none text-white/90">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>

              {isStreaming && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-[#007AFF] ml-1 align-middle"
                />
              )}

              {message.tokens && !isStreaming && (
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-[10px] text-white/40">
                  <span>{message.tokens.input + message.tokens.output} tokens</span>
                  {message.cost && <span>${message.cost.toFixed(4)}</span>}
                </div>
              )}
            </GlassCard>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
