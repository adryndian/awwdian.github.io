'use client';

import { MODELS, ModelId } from '@/lib/models/config';
import { Dispatch, SetStateAction } from 'react';

type ModelType = ModelId;

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: Dispatch<SetStateAction<ModelType>>;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const getCostBadge = (level: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[level as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Select Model</label>
      <select
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as ModelType)}
        disabled={disabled}
        className="w-full p-2 border rounded-lg bg-white disabled:bg-gray-100"
      >
        {Object.values(MODELS).map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} - {model.description}
          </option>
        ))}
      </select>
      
      <div className="flex gap-2 flex-wrap">
        {Object.values(MODELS).map((model) => (
          <button
            key={model.id}
            onClick={() => onModelChange(model.id)}
            disabled={disabled || selectedModel === model.id}
            className={`px-3 py-1 text-xs rounded-full border transition-colors
              ${selectedModel === model.id 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white hover:bg-gray-50 border-gray-300'
              } disabled:opacity-50`}
          >
            {model.name}
            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${getCostBadge(model.costLevel)}`}>
              {model.costLevel}
            </span>
            {model.supportsThinking && (
              <span className="ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                thinking
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
