// src/lib/bedrock/deepseek.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient } from "./client";

// ============================================
// DeepSeek Model Configuration
// ============================================
const DEEPSEEK_MODELS = {
  primary: "us.deepseek.r1-v1:0",
  fallback: "us.deepseek.r1-v1:0",
} as const;

interface DeepSeekMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DeepSeekResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  thinkingContent?: string;
}

// ============================================
// Build Payload - Messages format
// ============================================
function buildMessagesPayload(
  messages: DeepSeekMessage[],
  maxTokens: number = 4096,
  temperature: number = 0.7
) {
  return {
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    max_tokens: maxTokens,
    temperature,
    top_p: 0.9,
  };
}

// ============================================
// Build Payload - Prompt format (fallback)
// Some Bedrock DeepSeek models use raw prompt
// ============================================
function buildPromptPayload(
  messages: DeepSeekMessage[],
  maxTokens: number = 4096,
  temperature: number = 0.7
) {
  let prompt = "";
  for (const msg of messages) {
    if (msg.role === "system") {
      prompt += `<|system|>\n${msg.content}\n`;
    } else if (msg.role === "user") {
      prompt += `<|user|>\n${msg.content}\n`;
    } else if (msg.role === "assistant") {
      prompt += `<|assistant|>\n${msg.content}\n`;
    }
  }
  prompt += `<|assistant|>\n`;

  return {
    prompt,
    max_tokens: maxTokens,
    temperature,
    top_p: 0.9,
  };
}

// ============================================
// Parse Response - handles multiple formats
// ============================================
function parseDeepSeekResponse(responseBody: any): DeepSeekResponse {
  // Format 1: Messages API response (choices array)
  if (responseBody.choices && responseBody.choices.length > 0) {
    const choice = responseBody.choices[0];
    return {
      content:
        choice.message?.content ||
        choice.text ||
        "",
      inputTokens: responseBody.usage?.prompt_tokens || 0,
      outputTokens: responseBody.usage?.completion_tokens || 0,
      thinkingContent: choice.message?.reasoning_content || undefined,
    };
  }

  // Format 2: Direct generation response
  if (responseBody.generation) {
    return {
      content: responseBody.generation,
      inputTokens: responseBody.prompt_token_count || 0,
      outputTokens: responseBody.generation_token_count || 0,
    };
  }

  // Format 3: Completion response
  if (responseBody.completions && responseBody.completions.length > 0) {
    return {
      content: responseBody.completions[0].data?.text || "",
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  // Format 4: Direct output
  if (responseBody.output || responseBody.text || responseBody.content) {
    return {
      content:
        responseBody.output ||
        responseBody.text ||
        responseBody.content ||
        "",
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  // Format 5: Raw string response
  if (typeof responseBody === "string") {
    return {
      content: responseBody,
      inputTokens: 0,
      outputTokens: 0,
    };
  }

  console.error(
    "Unknown DeepSeek response format:",
    JSON.stringify(responseBody, null, 2)
  );
  throw new Error(
    "Format respons DeepSeek tidak dikenali. Response: " +
      JSON.stringify(responseBody).substring(0, 200)
  );
}

// ============================================
// Main: Invoke DeepSeek
// Tries primary model, falls back if needed
// ============================================
export async function invokeDeepSeek(
  messages: DeepSeekMessage[],
  maxTokens: number = 4096,
  temperature: number = 0.7
): Promise<DeepSeekResponse> {
  const client = getBedrockClient();

  // Try models in order
  const modelsToTry = [
    DEEPSEEK_MODELS.primary,
    DEEPSEEK_MODELS.fallback,
  ];

  // Try payload formats
  const payloadBuilders = [
    buildMessagesPayload,
    buildPromptPayload,
  ];

  let lastError: Error | null = null;

  for (const modelId of modelsToTry) {
    for (const buildPayload of payloadBuilders) {
      try {
        const payload = buildPayload(messages, maxTokens, temperature);

        console.log(`[DeepSeek] Trying model: ${modelId}`);
        console.log(`[DeepSeek] Payload format: ${buildPayload.name}`);
        console.log(`[DeepSeek] Payload:`, JSON.stringify(payload).substring(0, 300));

        const command = new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(payload),
        });

        const response = await client.send(command);
        const responseText = new TextDecoder().decode(response.body);

        console.log(`[DeepSeek] Raw response:`, responseText.substring(0, 500));

        const responseBody = JSON.parse(responseText);
        const parsed = parseDeepSeekResponse(responseBody);

        if (parsed.content && parsed.content.trim().length > 0) {
          console.log(`[DeepSeek] Success with ${modelId} + ${buildPayload.name}`);
          return parsed;
        }

        console.warn(`[DeepSeek] Empty response from ${modelId}, trying next...`);
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[DeepSeek] Failed with ${modelId} + ${buildPayload.name}:`,
          err.message
        );
        continue;
      }
    }
  }

  // All attempts failed
  throw new Error(
    `DeepSeek gagal merespon setelah mencoba semua model dan format. ` +
      `Error terakhir: ${lastError?.message || "Unknown"}. ` +
      `Pastikan model DeepSeek sudah di-enable di AWS Bedrock Console ` +
      `(region: ${process.env.AWS_REGION || "us-east-1"}).`
  );
}