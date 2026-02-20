'use client';

import { getAllModels } from '@/lib/models/config';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const models = getAllModels();
  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>{model.name} ({model.provider})</option>
      ))}
    </select>
  );
}