'use client';

import { useState } from 'react';
import { ChevronDown, Zap, Brain, Cpu } from 'lucide-react'; // Ganti Bolt dengan Cpu
import { ModelId } from '@/types';
import { MODELS } from '@/lib/models/config';

interface ModelSelectorProps {
  selected: ModelId;
  onSelect: (model: ModelId) => void;
}

// Ganti Bolt dengan Cpu untuk deepseek-r1
const modelIcons = {
  'claude-sonnet-4-5': Zap,
  'claude-opus-4-6': Brain,
  'deepseek-r1': Cpu, // WAS: Bolt
};

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = MODELS[selected];
  const Icon = modelIcons[selected] || Zap;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-white"
      >
        <Icon className="w-4 h-4" style={{ color: selectedModel.color }} />
        <span className="text-sm font-medium">{selectedModel.name}</span>
        <ChevronDown className="w-4 h-4 text-white/40" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
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
                  className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                    isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <ModelIcon className="w-5 h-5 mt-0.5" style={{ color: model.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{model.name}</p>
                    <p className="text-xs text-white/50">{model.description}</p>
                    <p className="text-xs text-white/30 mt-1">
                      ${model.inputPricePer1K}/1K tokens
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
