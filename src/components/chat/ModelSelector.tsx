'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Brain, Cpu, Flame, Check } from 'lucide-react';
import { ModelId } from '@/types';
import { MODELS } from '@/lib/models/config';

interface ModelSelectorProps {
  selected: ModelId;
  onSelect: (model: ModelId) => void;
  disabled?: boolean;
}

const modelIcons: Record<ModelId, React.ElementType> = {
  'claude-sonnet-4-5': Zap,
  'claude-opus-4-6': Brain,
  'deepseek-r1': Cpu,
  'llama-4-maverick': Flame,
};

const modelBadge: Record<ModelId, string> = {
  'claude-sonnet-4-5': 'Anthropic',
  'claude-opus-4-6': 'Anthropic',
  'deepseek-r1': 'DeepSeek',
  'llama-4-maverick': 'Meta',
};

export function ModelSelector({ selected, onSelect, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedModel = MODELS[selected];
  const Icon = modelIcons[selected] || Zap;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-xl glass-input text-sm font-semibold text-white transition-all hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: selectedModel.color }}
        />
        <span className="drop-shadow-sm">{selectedModel.name}</span>
        <ChevronDown
          className="w-4 h-4 text-white/70 transition-transform drop-shadow-sm"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-80 glass-card rounded-2xl shadow-[var(--shadow-elevated)] z-50 overflow-hidden py-2 animate-scaleIn">
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider px-4 pt-2 pb-3 drop-shadow-sm">
            Model
          </p>
          {(Object.keys(MODELS) as ModelId[]).map((modelId) => {
            const model = MODELS[modelId];
            const ModelIcon = modelIcons[modelId] || Zap;
            const isSelected = selected === modelId;

            return (
              <button
                key={modelId}
                onClick={() => {
                  onSelect(modelId);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                  isSelected ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: `${model.color}30` }}
                >
                  <ModelIcon className="w-4 h-4 drop-shadow" style={{ color: model.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white truncate drop-shadow-sm">
                      {model.name}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm"
                      style={{
                        backgroundColor: `${model.color}25`,
                        color: model.color,
                      }}
                    >
                      {modelBadge[modelId]}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 truncate drop-shadow-sm">
                    {model.description}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-5 h-5 shrink-0 drop-shadow" style={{ color: model.color }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
