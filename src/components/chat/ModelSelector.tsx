'use client';

import { ModelType } from '@/types';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  disabled?: boolean;
}

const MODEL_OPTIONS: Array<{ id: ModelType; name: string; description: string }> = [
  { id: 'claude', name: 'Claude', description: 'Most capable, best for complex tasks' },
  { id: 'llama', name: 'LLaMA', description: 'Fast and efficient' },
  { id: 'deepseek', name: 'DeepSeek', description: 'Specialized for code' },
];

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as ModelType)}
        disabled={disabled}
        className="px-3 py-1.5 text-xs font-medium rounded-lg 
          bg-white/5 border border-white/10 text-white
          hover:bg-white/10 transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      >
        {MODEL_OPTIONS.map((model) => (
          <option key={model.id} value={model.id} className="bg-gray-900 text-white">
            {model.name}
          </option>
        ))}
      </select>
      
      {/* Mobile: Chip buttons */}
      <div className="hidden sm:flex gap-1.5">
        {MODEL_OPTIONS.map((model) => (
          <button
            key={model.id}
            onClick={() => onModelChange(model.id)}
            disabled={disabled || selectedModel === model.id}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all
              ${selectedModel === model.id 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={model.description}
          >
            {model.name}
          </button>
        ))}
      </div>
    </div>
  );
}
