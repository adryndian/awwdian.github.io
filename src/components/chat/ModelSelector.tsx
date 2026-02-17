'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Brain, Cpu, Flame, Check } from 'lucide-react';
import { ModelId } from '@/types';
import { MODELS } from '@/lib/models/config';
import { posthog } from '@/lib/posthog';

interface ModelSelectorProps {
  selected: ModelId;
  onSelect: (model: ModelId) => void;
  disabled?: boolean;
}

const modelIcons: Record<ModelId, React.ElementType> = {
  'claude-sonnet-4-5': Zap,
  'claude-opus-4-6':   Brain,
  'deepseek-r1':       Cpu,
  'llama-4-maverick':  Flame,
};

const modelBadge: Record<ModelId, string> = {
  'claude-sonnet-4-5': 'Anthropic',
  'claude-opus-4-6':   'Anthropic',
  'deepseek-r1':       'DeepSeek',
  'llama-4-maverick':  'Meta',
};

export function ModelSelector({ selected, onSelect, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedModel = MODELS[selected];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    const next = !isOpen;
    setIsOpen(next);
    if (next) posthog.capture('model_selector_opened', { currentModel: selected });
  };

  const handleSelect = (modelId: ModelId) => {
    posthog.capture('model_selected', {
      modelId,
      modelName: MODELS[modelId].name,
      previousModelId: selected,
    });
    onSelect(modelId);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-input
                   text-sm font-semibold text-white
                   hover:bg-white/12 transition-smooth
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedModel.color }} />
        <span>{selectedModel.name}</span>
        <ChevronDown
          className="w-3.5 h-3.5 text-white/50 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 glass-dark rounded-2xl
                        shadow-[var(--shadow-elevated)] z-50 overflow-hidden py-2 border border-white/10
                        animate-scaleIn">
          <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest px-4 pt-2 pb-2">
            Pilih Model
          </p>
          {(Object.keys(MODELS) as ModelId[]).map((id) => {
            const m = MODELS[id];
            const Icon = modelIcons[id] || Zap;
            const active = selected === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-smooth ${
                  active ? 'bg-white/15' : 'hover:bg-white/8'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${m.color}25` }}
                >
                  <Icon className="w-4 h-4" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide"
                      style={{ color: m.color, backgroundColor: `${m.color}20` }}
                    >
                      {modelBadge[id]}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 truncate">{m.description}</p>
                </div>
                {active && <Check className="w-4 h-4 shrink-0" style={{ color: m.color }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
