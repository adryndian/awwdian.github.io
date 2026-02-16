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
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-white hover:bg-gray-50 transition-all text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: isOpen ? selectedModel.color + '40' : undefined }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: selectedModel.color }}
        />
        <span>{selectedModel.name}</span>
        <ChevronDown
          className="w-3.5 h-3.5 text-[var(--text-muted)] transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-[var(--border-subtle)] rounded-2xl shadow-[var(--shadow-lg)] z-50 overflow-hidden py-1.5">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 pt-1.5 pb-2">
            Model
          </p>
          {(Object.keys(MODELS) as ModelId[]).map((modelId) => {
            const model = MODELS[modelId];
            const ModelIcon = modelIcons[modelId] || Zap;
            const isSelected = selected === modelId;

            return (
              <button
                key={modelId}
                onClick={() => { onSelect(modelId); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isSelected ? 'bg-[var(--accent-blue-light)]' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: model.color + '15' }}
                >
                  <ModelIcon className="w-4 h-4" style={{ color: model.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {model.name}
                    </p>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: model.color + '15',
                        color: model.color,
                      }}
                    >
                      {modelBadge[modelId]}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {model.description}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 shrink-0" style={{ color: model.color }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
