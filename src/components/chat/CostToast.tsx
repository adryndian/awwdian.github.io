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
      className={`fixed bottom-28 sm:bottom-32 right-4 glass-dark border border-white/10
                  rounded-2xl px-4 py-3 shadow-[var(--shadow-elevated)] z-50 min-w-[220px]
                  transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${model?.color}25` }}
        >
          <Coins className="w-4 h-4" style={{ color: model?.color || '#10b981' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-xs font-semibold text-white/90">{model?.name}</p>
            <button
              onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
              className="text-white/35 hover:text-white transition-smooth"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/50">
              {usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()} out
            </span>
            {usage.costUSD > 0 && (
              <span className="text-[11px] font-bold text-emerald-300">
                ${usage.costUSD.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
