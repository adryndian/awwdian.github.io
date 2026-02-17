// src/lib/bedrock/claude.ts
import {
  InvokeModelCommand,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getBedrockClient } from "./client";

const CLAUDE_MODELS = {
  primary: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  fallback1: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  fallback2: "anthropic.claude-3-haiku-20240307-v1:0",
} as const;

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

export async function invokeClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string,
  maxTokens: number = 4096,
  temperature: number = 0.7
): Promise<ClaudeResponse> {
  const client = getBedrockClient();

  const modelsToTry = [
    CLAUDE_MODELS.primary,
    CLAUDE_MODELS.fallback1,
    CLAUDE_MODELS.fallback2,
  ];

  let lastError: Error | null = null;

  for (const modelId of modelsToTry) {
    try {
      console.log(`[Claude] Trying ${modelId}...`);

      // Claude uses Anthropic Messages API format
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        ...(systemPrompt && { system: systemPrompt }),
      };

      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const responseText = new TextDecoder().decode(response.body);
      const responseBody = JSON.parse(responseText);

      console.log(`[Claude] Response received from ${modelId}`);

      // Claude response format: { content: [{ type: "text", text: "..." }] }
      if (responseBody.content && responseBody.content.length > 0) {
        const text = responseBody.content
          .filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("");

        return {
          content: text,
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
        };
      }

      throw new Error("Empty response from Claude");
    } catch (err: any) {
      lastError = err;
      console.warn(`[Claude] ❌ ${modelId} failed:`, err.message);

      if (
        err.name === "AccessDeniedException" ||
        err.message?.includes("not authorized")
      ) {
        continue; // Try next model
      }

      // For non-access errors, might be transient - still try next
      continue;
    }
  }

  throw new Error(
    `Claude gagal merespon. Error: ${lastError?.message || "Unknown"}. ` +
      `Pastikan model Claude sudah di-enable di AWS Bedrock Console.`
  );
}