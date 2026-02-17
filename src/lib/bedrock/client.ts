// src/lib/bedrock/client.ts
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

let clientInstance: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (clientInstance) return clientInstance;

  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`[Bedrock] Initializing client for region: ${region}`);

  // Validate credentials exist
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn(
      "[Bedrock] AWS credentials not found in env vars. " +
        "Falling back to default credential chain (IAM role, etc.)"
    );
  }

  const config: any = { region };

  // Only set explicit credentials if provided
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      ...(process.env.AWS_SESSION_TOKEN && {
        sessionToken: process.env.AWS_SESSION_TOKEN,
      }),
    };
  }

  clientInstance = new BedrockRuntimeClient(config);
  return clientInstance;
}

// Reset client (useful for testing or credential rotation)
export function resetBedrockClient(): void {
  clientInstance = null;
}