import {
  MODELS,
  DEFAULT_MODEL,
  AWS_REGION,
  isValidModelId,
  getModelConfig,
  getAllModels,
  getModelsByProvider,
} from '@/lib/models/config';

import type { ModelId, ModelConfig, Provider } from '@/lib/models/config';

export {
  MODELS,
  DEFAULT_MODEL,
  AWS_REGION,
  isValidModelId,
  getModelConfig,
  getAllModels,
  getModelsByProvider,
};

export type { ModelId, ModelConfig, Provider };

export const APP_CONFIG = {
  name: 'Beckrock AI',
  version: '0.2.0',
  aws: {
    region: AWS_REGION,
  },
  limits: {
    maxRequestsPerMinute: Infinity,
    maxTokensPerRequest: 16384,
  },
} as const;
