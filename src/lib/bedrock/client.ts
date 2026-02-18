// ============================================================
// src/lib/bedrock/client.ts — Bedrock Client Singleton
// ============================================================

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
// FIX: Import dari config, bukan dari @/types (types tidak export AWS_REGION)
import { AWS_REGION } from '@/lib/models/config';

let bedrockClient: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return bedrockClient;
}

export function resetBedrockClient(): void {
  bedrockClient = null;
}
