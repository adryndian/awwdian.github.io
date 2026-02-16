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
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-24 right-4 bg-white border border-[var(--border-subtle)] rounded-2xl px-4 py-3 shadow-[var(--shadow-lg)] z-50 min-w-[220px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: model?.color + '15' }}
        >
          <Coins className="w-4 h-4" style={{ color: model?.color || '#10B981' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {model?.name || 'AI'}
            </p>
            <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }}>
              <X className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-[var(--text-muted)]">
              {usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()} out
            </span>
            {usage.costUSD > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600">
                ${usage.costUSD.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
