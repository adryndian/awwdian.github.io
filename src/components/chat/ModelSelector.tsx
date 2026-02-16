'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Image as ImageIcon, Video, Zap } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { MODELS, ModelConfig, ModelId } from '@/lib/models/config';

const AVAILABLE_MODELS = Object.values(MODELS);

import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModel: ModelId;
  onSelectModel: (modelId: ModelId) => void;
}

export function ModelSelector({ selectedModel, onSelectModel }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selected = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  const getIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'multimodal': return <Sparkles className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative z-50">
      <GlassCard
        hover
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full', selected.color)} />
          <span className="text-white font-medium">{selected.name}</span>
          <ChevronDown className={cn(
            'w-4 h-4 text-white/60 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </div>
      </GlassCard>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 z-50"
            >
              <GlassCard className="p-2 max-h-80 overflow-y-auto">
                {AVAILABLE_MODELS.map((model) => (
                  <motion.button
                    key={model.id}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-xl text-left',
                      'transition-colors',
                      selectedModel === model.id 
                        ? 'bg-white/20' 
                        : 'hover:bg-white/10'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      model.color
                    )}>
                      {getIcon(model.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white">{model.name}</div>
                      <div className="text-sm text-white/60 truncate">{model.description}</div>
                      <div className="text-xs text-white/40 mt-1">{model.costPer1KTokens}</div>
                    </div>
                    {selectedModel === model.id && (
                      <div className="w-2 h-2 rounded-full bg-[#007AFF] self-center" />
                    )}
                  </motion.button>
                ))}
              </GlassCard>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
