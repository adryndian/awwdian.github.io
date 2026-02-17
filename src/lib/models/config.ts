// src/lib/models/config.ts
import type { ModelType, ModelConfig } from "@/types";

export const MODEL_CONFIGS: Record<ModelType, ModelConfig> = {
  claude: {
    id: "claude",
    name: "Claude 3.5 Sonnet",
    description: "Analisis mendalam, penulisan, dan coding",
    maxTokens: 4096,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    available: true,
  },
  llama: {
    id: "llama",
    name: "LLaMA 3.1",
    description: "Open-source, cepat, dan efisien",
    maxTokens: 2048,
    costPer1kInput: 0.00099,
    costPer1kOutput: 0.00099,
    available: true,
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek R1",
    description: "Reasoning dan coding tingkat lanjut",
    maxTokens: 4096,
    costPer1kInput: 0.0014,
    costPer1kOutput: 0.0014,
    available: true,
  },
};

// AWS Bedrock Model IDs - ordered by preference
export const BEDROCK_MODEL_IDS: Record<ModelType, string[]> = {
  claude: [
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
  ],
  llama: [
    "meta.llama3-1-70b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "meta.llama3-8b-instruct-v1:0",
  ],
  deepseek: [
    "deepseek.deepseek-r1-distill-llama-70b",
    "deepseek.deepseek-r1-distill-llama-8b",
  ],
};

// Supported AWS Regions for each model
export const MODEL_REGIONS: Record<ModelType, string[]> = {
  claude: [
    "us-east-1",
    "us-west-2",
    "eu-west-1",
    "ap-northeast-1",
    "ap-southeast-1",
  ],
  llama: [
    "us-east-1",
    "us-west-2",
    "eu-west-1",
    "ap-northeast-1",
  ],
  deepseek: [
    "us-east-1",
    "us-west-2",
  ],
};

export function isModelAvailableInRegion(
  model: ModelType,
  region: string
): boolean {
  return MODEL_REGIONS[model]?.includes(region) || false;
}