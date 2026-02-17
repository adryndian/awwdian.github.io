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

  // 📊 Track dropdown opened
  const handleToggle = () => {
    if (disabled) return;
    
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      posthog.capture('model_selector_opened', {
        currentModel: selected,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // 📊 Track model selection
  const handleModelSelect = (modelId: ModelId) => {
    const previousModel = selected;
    const newModel = MODELS[modelId];
    const oldModel = MODELS[previousModel];

    // Track model change
    posthog.capture('model_selected', {
      modelId: modelId,
      modelName: newModel.name,
      modelProvider: modelBadge[modelId],
      previousModelId: previousModel,
      previousModelName: oldModel.name,
      supportsStreaming: newModel.supportsStreaming,
      priceDifference: {
        input: newModel.inputPricePer1K - oldModel.inputPricePer1K,
        output: newModel.outputPricePer1K - oldModel.outputPricePer1K,
      },
      timestamp: new Date().toISOString(),
    });

    onSelect(modelId);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-input text-xs font-medium text-white transition-all hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: selectedModel.color }}
        />
        <span className="drop-shadow-sm whitespace-nowrap">{selectedModel.name}</span>
        <ChevronDown
          className="w-3 h-3 text-white/70 transition-transform drop-shadow-sm"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 glass-card rounded-xl shadow-[var(--shadow-elevated)] z-50 overflow-hidden py-1.5 animate-scaleIn">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider px-3 pt-1.5 pb-2 drop-shadow-sm">
            Model
          </p>
          {(Object.keys(MODELS) as ModelId[]).map((modelId) => {
            const model = MODELS[modelId];
            const ModelIcon = modelIcons[modelId] || Zap;
            const isSelected = selected === modelId;

            return (
              <button
                key={modelId}
                onClick={() => handleModelSelect(modelId)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all ${
                  isSelected ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: `${model.color}30` }}
                >
                  <ModelIcon className="w-3.5 h-3.5 drop-shadow" style={{ color: model.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-semibold text-white truncate drop-shadow-sm">
                      {model.name}
                    </p>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm"
                      style={{
                        backgroundColor: `${model.color}25`,
                        color: model.color,
                      }}
                    >
                      {modelBadge[modelId]}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60 truncate drop-shadow-sm">
                    {model.description}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 shrink-0 drop-shadow" style={{ color: model.color }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
