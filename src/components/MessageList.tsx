'use client';

import { motion } from 'framer-motion';
import { User, Bot, FileText, Image as ImageIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Message } from '@/types';
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
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center: 'text',
    maxTokens: 4096,
    supportsFileUpload: true,
    supportsImageUpload: true,
    costPer1KTokens: '$15.00 / $75.00',
    color: 'bg-indigo-500',
  },
  {
    id: 'anthropic.claude-3-sonnet-20240229-v1:0',
    name: 'Claude 3 Sonnet',
    description: 'Previous generation Sonnet',
    type: 'text',
    maxTokens: 4096,
    supportsFileUpload: true,
    supportsImageUpload: true,
    costPer1KTokens: '$3.00 / $15.00',
    color: 'bg-cyan-500',
  },
];

export const DEFAULT_MODEL: ModelId = 'anthropic.claude-sonnet-4-6-v1';

export function getModelById(id: ModelId): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(model => model.id === id);
}

export function supportsFileUpload(modelId: ModelId): boolean {
  const model = getModelById(modelId);
  return model?.supportsFileUpload ?? false;
}

export function supportsImageUpload(modelId: ModelId): boolean {
  const model = getModelById(modelId);
  return model?.supportsImageUpload ?? false;
}
