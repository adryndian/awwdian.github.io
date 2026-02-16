'use client';

import { UsageInfo } from '@/types';
import { X, DollarSign } from 'lucide-react';
import { useEffect } from 'react';

interface CostToastProps {
  usage: UsageInfo;
  onClose: () => void;
}

export function CostToast({ usage, onClose }: CostToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-20 right-4 bg-gray-900 border border-white/10 rounded-xl p-4 shadow-xl z-50 animate-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <DollarSign className="w-5 h-5 text-green-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-white">Request selesai</p>
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-2 text-xs text-white/60 space-y-1">
            <div className="flex justify-between gap-8">
              <span>Input tokens:</span>
              <span className="text-white">{usage.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span>Output tokens:</span>
              <span className="text-white">{usage.outputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-8 pt-1 border-t border-white/10">
              <span className="text-green-400">Cost:</span>
              <span className="text-green-400 font-medium">${usage.costUSD.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
