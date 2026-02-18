'use client';

import type { ModelId, ModelConfig } from '@/types';

interface ModelSelectorProps {
  models: ModelConfig[];
  currentModel: ModelId;
  onSelect: (modelId: ModelId) => void;
  disabled?: boolean;
}

export function ModelSelector({ models, currentModel, onSelect, disabled }: ModelSelectorProps) {
  const getCostBadgeStyle = (level: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-500/10 text-red-400 border-red-500/20',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      low: 'bg-green-500/10 text-green-400 border-green-500/20',
    };
    return colors[level] || colors.medium;
  };

  const getProviderStyle = (provider: string) => {
    const styles: Record<string, string> = {
      anthropic: 'bg-orange-500/5 border-orange-500/20 text-orange-300',
      deepseek: 'bg-blue-500/5 border-blue-500/20 text-blue-300',
      meta: 'bg-purple-500/5 border-purple-500/20 text-purple-300',
    };
    return styles[provider] || styles.meta;
  };

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      anthropic: 'Anthropic',
      deepseek: 'DeepSeek',
      meta: 'Meta',
    };
    return labels[provider] || provider;
  };

  return (
    <div className="space-y-3">
      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <label className="block text-xs font-medium text-white/60 mb-1.5">Model</label>
        <select
          value={currentModel}
          onChange={(e) => onSelect(e.target.value as ModelId)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white
            hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id} className="bg-gray-900">
              {model.name} · {model.costLevel}
              {model.supportsThinking ? ' · thinking' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop grid selector */}
      <div className="hidden sm:block">
        <label className="block text-xs font-medium text-white/60 mb-2">Select Model</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {models.map((model) => {
            const isSelected = currentModel === model.id;
            return (
              <button
                key={model.id}
                onClick={() => onSelect(model.id)}
                disabled={disabled || isSelected}
                className={`
                  relative p-3 rounded-xl border transition-all duration-200 text-left
                  ${isSelected
                    ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getProviderStyle(model.provider)}`}>
                    {getProviderLabel(model.provider)}
                  </span>
                  {isSelected && <span className="text-orange-400 text-xs">✓</span>}
                </div>

                <div className="text-sm font-semibold text-white mb-1">{model.name}</div>
                <div className="text-[11px] text-white/50 mb-2 line-clamp-2 min-h-[28px]">
                  {model.description}
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getCostBadgeStyle(model.costLevel)}`}>
                    {model.costLevel}
                  </span>
                  {model.supportsThinking && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      thinking
                    </span>
                  )}
                  {model.supportsStreaming && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      stream
                    </span>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-white/40">
                    {model.maxTokens.toLocaleString()} tokens
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
