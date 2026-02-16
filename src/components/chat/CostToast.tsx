'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { UsageInfo } from '@/types';
import { MODELS } from '@/lib/models/config';
import { X, Coins } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CostToastProps {
  usage: UsageInfo | null;
  onClose: () => void;
}

export function CostToast({ usage, onClose }: CostToastProps) {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!usage || isPaused) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [usage, isPaused, onClose]);

  if (!usage) return null;

  const model = MODELS[usage.model];
  const savings = usage.model === 'deepseek-r1' 
    ? ((15 - 0.5) / 15 * 100).toFixed(0) 
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onHoverStart={() => setIsPaused(true)}
        onHoverEnd={() => setIsPaused(false)}
        className="fixed bottom-24 right-4 z-50 w-64"
      >
        <GlassCard className="p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: model.color }}
              />
              <span className="text-white font-medium text-sm">{model.name}</span>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-3 h-3 text-white/60" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/50">Input</div>
              <div className="text-white font-mono">{(usage.inputTokens / 1000).toFixed(1)}k</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-white/50">Output</div>
              <div className="text-white font-mono">{(usage.outputTokens / 1000).toFixed(1)}k</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-white font-bold">${usage.costUSD.toFixed(4)}</span>
            </div>
            {savings && (
              <span className="text-xs text-emerald-400 font-medium">
                Saved {savings}%
              </span>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
}
