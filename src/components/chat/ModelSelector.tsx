'use client';

import { ModelConfig, ModelId } from '@/lib/models/config';

interface ModelSelectorProps {
  models: ModelConfig[];
  currentModel: ModelId;
  onSelect: (modelId: ModelId) => void;
  disabled?: boolean;
}

export function ModelSelector({ models, currentModel, onSelect, disabled }: ModelSelectorProps) {
  const getCostBadge = (level: string) => {
    const colors = {
      high: 'bg-red-500/10 text-red-400 border-red-500/20',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      low: 'bg-green-500/10 text-green-400 border-green-500/20',
    };
    return colors[level as keyof typeof colors] || colors.medium;
  };

  const getProviderColor = (provider: string) => {
    return provider === 'anthropic' 
      ? 'bg-orange-500/5 border-orange-500/20' 
      : 'bg-blue-500/5 border-blue-500/20';
  };

  return (
    <div className="space-y-3">
      {/* Compact Dropdown for Mobile */}
      <div className="sm:hidden">
        <label className="block text-xs font-medium text-white/60 mb-1.5">Model</label>
        <select
          value={currentModel}
          onChange={(e) => onSelect(e.target.value as ModelId)}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm rounded-lg 
            bg-white/5 border border-white/10 text-white
            hover:bg-white/10 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id} className="bg-gray-900">
              {model.name} • {model.costLevel}
              {model.supportsThinking ? ' • thinking' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Card-based Selector for Desktop */}
      <div className="hidden sm:block">
        <label className="block text-xs font-medium text-white/60 mb-2">Select Model</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${!isSelected && !disabled ? 'hover:scale-[1.02] hover:shadow-lg' : ''}
                `}
              >
                {/* Provider Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getProviderColor(model.provider)}`}>
                    {model.provider === 'anthropic' ? 'Anthropic' : 'Meta'}
                  </span>
                  {isSelected && (
                    <span className="text-orange-400 text-xs">✓</span>
                  )}
                </div>

                {/* Model Name */}
                <div className="text-sm font-semibold text-white mb-1">
                  {model.name}
                </div>

                {/* Description */}
                <div className="text-[11px] text-white/50 mb-2 line-clamp-2 min-h-[32px]">
                  {model.description}
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap gap-1.5">
                  {/* Cost Badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getCostBadge(model.costLevel)}`}>
                    {model.costLevel} cost
                  </span>

                  {/* Thinking Badge (Opus 4.6 only) */}
                  {model.supportsThinking && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      extended thinking
                    </span>
                  )}

                  {/* Streaming Badge */}
                  {model.supportsStreaming && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      streaming
                    </span>
                  )}
                </div>

                {/* Max Tokens Indicator */}
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
