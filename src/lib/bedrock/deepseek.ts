// src/lib/bedrock/deepseek.ts
//
// ROOT CAUSE ERROR:
// "No content generated! The model may be unavailable or rate limited."
//
// Kemungkinan penyebab:
// 1. Menggunakan InvokeModel dengan format body yang salah untuk DeepSeek R1
// 2. Response stream tidak di-parse dengan benar (DeepSeek R1 punya <think> tag)
// 3. Model mungkin sedang throttled
//
// FIX:
// 1. Ganti ke ConverseStreamCommand (sama seperti Llama fix)
// 2. Handle <think>...</think> tags dari DeepSeek R1 (chain-of-thought reasoning)
//    — strip dari output atau optionally tampilkan

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

// Model ID DeepSeek R1 di AWS Bedrock
const DEEPSEEK_MODEL_ID = 'deepseek.r1-v1:0';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type StreamReturn = AsyncGenerator<
  string,
  { inputTokens: number; outputTokens: number; costUSD: number }
>;

// Pricing DeepSeek R1 on Bedrock (USD per 1000 tokens)
const COST_PER_1K_INPUT  = 0.00055;
const COST_PER_1K_OUTPUT = 0.00219;

// DeepSeek R1 mengeluarkan <think>...</think> untuk chain-of-thought.
// Kita buffer dan skip bagian thinking, hanya stream final answer.
function stripThinkingTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

export async function* streamDeepSeek(messages: Message[]): StreamReturn {
  console.log('[DeepSeek] Starting Converse stream, messages:', messages.length);

  const converseMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: [{ text: m.content }],
  }));

  const command = new ConverseStreamCommand({
    modelId: DEEPSEEK_MODEL_ID,
    messages: converseMessages,
    inferenceConfig: {
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
    },
  });

  let inputTokens  = 0;
  let outputTokens = 0;
  let totalContent = '';
  let thinkingBuffer = '';
  let insideThinking = false;

  try {
    const response = await client.send(command);

    if (!response.stream) {
      throw new Error('DeepSeek did not return a stream');
    }

    for await (const event of response.stream) {
      if (event.contentBlockDelta?.delta?.text) {
        const chunk = event.contentBlockDelta.delta.text;
        thinkingBuffer += chunk;

        // Handle <think> tags streaming — buffer sampai tag lengkap
        let processed = '';
        let tempBuf = thinkingBuffer;

        // State machine sederhana untuk skip <think>...</think> blocks
        while (tempBuf.length > 0) {
          if (insideThinking) {
            const closeIdx = tempBuf.indexOf('</think>');
            if (closeIdx !== -1) {
              insideThinking = false;
              tempBuf = tempBuf.slice(closeIdx + '</think>'.length);
              thinkingBuffer = tempBuf;
            } else {
              // Masih di dalam thinking block, skip semua
              break;
            }
          } else {
            const openIdx = tempBuf.indexOf('<think>');
            if (openIdx !== -1) {
              // Ada bagian sebelum <think>, itu output real
              processed += tempBuf.slice(0, openIdx);
              insideThinking = true;
              tempBuf = tempBuf.slice(openIdx + '<think>'.length);
              thinkingBuffer = tempBuf;
            } else {
              // Tidak ada thinking tag, check apakah ada partial tag di akhir
              const partialStart = tempBuf.lastIndexOf('<');
              if (partialStart !== -1 && partialStart > tempBuf.length - 10) {
                // Kemungkinan partial tag, buffer dulu
                processed += tempBuf.slice(0, partialStart);
                thinkingBuffer = tempBuf.slice(partialStart);
              } else {
                processed += tempBuf;
                thinkingBuffer = '';
              }
              break;
            }
          }
        }

        if (processed.length > 0) {
          totalContent += processed;
          yield processed;
        }
      }

      if (event.metadata?.usage) {
        inputTokens  = event.metadata.usage.inputTokens  ?? 0;
        outputTokens = event.metadata.usage.outputTokens ?? 0;
      }

      if (event.messageStop) {
        console.log('[DeepSeek] Stream complete, stopReason:', event.messageStop.stopReason);
        // Flush sisa buffer jika ada konten di luar thinking
        if (thinkingBuffer && !insideThinking) {
          totalContent += thinkingBuffer;
          yield thinkingBuffer;
          thinkingBuffer = '';
        }
      }
    }

    if (!totalContent) {
      throw new Error('DeepSeek did not generate any content. The model may be unavailable or rate limited.');
    }

    const costUSD =
      (inputTokens  / 1000) * COST_PER_1K_INPUT +
      (outputTokens / 1000) * COST_PER_1K_OUTPUT;

    console.log('[DeepSeek] Done:', { inputTokens, outputTokens, costUSD: costUSD.toFixed(6) });

    return { inputTokens, outputTokens, costUSD };

  } catch (err) {
    console.error('[DeepSeek] Stream error:', err);
    throw err;
  }
}
