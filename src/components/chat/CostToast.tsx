'use client';

import { UsageInfo } from '@/types';
import { X, Coins } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MODELS } from '@/lib/models/config';

interface CostToastProps {
  usage: UsageInfo;
  onClose: () => void;
}

export function CostToast({ usage, onClose }: CostToastProps) {
  const [visible, setVisible] = useState(false);
  const model = MODELS[usage.model];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-32 sm:bottom-36 right-4 glass-card rounded-2xl px-4 py-3.5 shadow-[var(--shadow-elevated)] z-40 min-w-[240px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
          style={{ backgroundColor: `${model?.color}30` }}
        >
          <Coins className="w-4 h-4 drop-shadow" style={{ color: model?.color || '#10B981' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-xs font-bold text-white/90 drop-shadow-sm">
              {model?.name || 'AI'}
            </p>
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(onClose, 300);
              }}
              className="text-white/50 hover:text-white transition-smooth"
            >
              <X className="w-3.5 h-3.5 drop-shadow" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/70 drop-shadow-sm font-medium">
              {usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()} out
            </span>
            {usage.costUSD > 0 && (
              <span className="text-[11px] font-bold text-emerald-300 drop-shadow-sm">
                ${usage.costUSD.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
