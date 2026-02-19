// src/components/chat/ModelSelector.tsx
'use client';

import { getAllModels } from '@/config';
import type { ModelId } from '@/config';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: ModelId) => void;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const models = getAllModels();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="model-select"
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Model:
      </label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as ModelId)}
        className="
          rounded-lg border border-gray-300 bg-white px-3 py-2
          text-sm shadow-sm transition-colors
          hover:border-gray-400
          focus:border-blue-500 focus:outline-none focus:ring-2
          focus:ring-blue-500/20
          dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200
          dark:hover:border-gray-500
        "
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} ({model.provider})
          </option>
        ))}
      </select>
    </div>
  );
}
