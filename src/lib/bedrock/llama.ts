// src/lib/bedrock/llama.ts
//
// ROOT CAUSE ERROR:
// Implementasi lama menggunakan InvokeModelWithResponseStream dengan body
// { messages: [...] } — tapi Llama InvokeModel API mengharapkan { prompt: "..." }.
//
// FIX: Ganti ke ConverseStreamCommand (Converse API) yang:
// 1. Menerima format { messages: [...] } secara native
// 2. Unified API — konsisten lintas semua model Bedrock
// 3. Tidak perlu convert messages ke prompt string manually

import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Model ID Llama 4 Maverick di AWS Bedrock
const LLAMA_MODEL_ID = 'meta.llama4-maverick-17b-instruct-v1:0';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type StreamReturn = AsyncGenerator<
  string,
  { inputTokens: number; outputTokens: number; costUSD: number }
>;

// Biaya per 1000 token (USD) — sesuaikan dengan pricing AWS Bedrock
const COST_PER_1K_INPUT  = 0.00022;
const COST_PER_1K_OUTPUT = 0.00088;

export async function* streamLlama(messages: Message[]): StreamReturn {
  console.log('[Llama] Starting Converse stream, messages:', messages.length);

  // Convert messages ke format Converse API
  const converseMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: [{ text: m.content }],
  }));

  const command = new ConverseStreamCommand({
    modelId: LLAMA_MODEL_ID,
    messages: converseMessages,
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
    },
  });

  let inputTokens  = 0;
  let outputTokens = 0;
  let totalContent = '';

  try {
    const response = await client.send(command);

    if (!response.stream) {
      throw new Error('Llama did not return a stream');
    }

    for await (const event of response.stream) {
      // Content chunk
      if (event.contentBlockDelta?.delta?.text) {
        const chunk = event.contentBlockDelta.delta.text;
        totalContent += chunk;
        yield chunk;
      }

      // Token usage
      if (event.metadata?.usage) {
        inputTokens  = event.metadata.usage.inputTokens  ?? 0;
        outputTokens = event.metadata.usage.outputTokens ?? 0;
      }

      // Stream complete
      if (event.messageStop) {
        console.log('[Llama] Stream complete, stopReason:', event.messageStop.stopReason);
      }
    }

    if (!totalContent) {
      throw new Error('Llama did not generate any content. The model may be unavailable or rate limited.');
    }

    const costUSD =
      (inputTokens  / 1000) * COST_PER_1K_INPUT +
      (outputTokens / 1000) * COST_PER_1K_OUTPUT;

    console.log('[Llama] Done:', { inputTokens, outputTokens, costUSD: costUSD.toFixed(6) });

    return { inputTokens, outputTokens, costUSD };

  } catch (err) {
    console.error('[Llama] Stream error:', err);
    throw err;
  }
}
