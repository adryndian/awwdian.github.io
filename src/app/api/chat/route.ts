// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { invokeClaude } from "@/lib/bedrock/claude";
import { invokeLlama } from "@/lib/bedrock/llama";
import { invokeDeepSeek } from "@/lib/bedrock/deepseek";
import type { ModelType } from "@/types";

// ============================================
// Cost calculation per model (per 1K tokens)
// ============================================
const COST_PER_1K_TOKENS: Record<
  ModelType,
  { input: number; output: number }
> = {
  claude: { input: 0.003, output: 0.015 },
  llama: { input: 0.00099, output: 0.00099 },
  deepseek: { input: 0.0014, output: 0.0014 },
};

function calculateCost(
  model: ModelType,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = COST_PER_1K_TOKENS[model];
  return (
    (inputTokens / 1000) * rates.input +
    (outputTokens / 1000) * rates.output
  );
}

// ============================================
// Format conversation history for each model
// ============================================
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function formatMessages(
  rawMessages: any[],
  currentMessage: string
): ChatMessage[] {
  const history: ChatMessage[] = (rawMessages || [])
    .filter((m: any) => m.content && m.role)
    .map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  history.push({
    role: "user",
    content: currentMessage,
  });

  return history;
}

// ============================================
// POST /api/chat
// ============================================
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      model,
      message,
      history = [],
    }: {
      model: ModelType;
      message: string;
      history: any[];
    } = body;

    // Validate input
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong" },
        { status: 400 }
      );
    }

    if (!["claude", "llama", "deepseek"].includes(model)) {
      return NextResponse.json(
        { error: `Model "${model}" tidak didukung. Gunakan: claude, llama, atau deepseek` },
        { status: 400 }
      );
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`[API] Model: ${model} | Message: ${message.substring(0, 100)}...`);
    console.log(`[API] History: ${history.length} messages`);

    const messages = formatMessages(history, message);

    let content: string;
    let inputTokens = 0;
    let outputTokens = 0;

    // ============================================
    // Route to correct model handler
    // ============================================
    switch (model) {
      case "claude": {
        const response = await invokeClaude(
          messages.map((m) => ({
            role: m.role === "system" ? "user" : m.role,
            content: m.content,
          })),
          "Kamu adalah asisten AI yang membantu. Jawab dalam bahasa yang sama dengan user.",
          4096,
          0.7
        );
        content = response.content;
        inputTokens = response.inputTokens;
        outputTokens = response.outputTokens;
        break;
      }

      case "llama": {
        const response = await invokeLlama(
          messages,
          2048,
          0.7
        );
        content = response.content;
        inputTokens = response.inputTokens;
        outputTokens = response.outputTokens;
        break;
      }

      case "deepseek": {
        const response = await invokeDeepSeek(
          messages,
          4096,
          0.7
        );
        content = response.content;
        inputTokens = response.inputTokens;
        outputTokens = response.outputTokens;
        break;
      }

      default:
        throw new Error(`Model handler not found: ${model}`);
    }

    // Calculate cost
    const cost = calculateCost(model, inputTokens, outputTokens);
    const duration = Date.now() - startTime;

    console.log(`[API] ✅ Success | ${duration}ms | Tokens: ${inputTokens}+${outputTokens} | Cost: $${cost.toFixed(6)}`);

    return NextResponse.json({
      content,
      cost,
      inputTokens,
      outputTokens,
      model,
      duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[API] ❌ Error after ${duration}ms:`, error.message);
    console.error(`[API] Stack:`, error.stack?.substring(0, 500));

    // Return detailed error for debugging
    return NextResponse.json(
      {
        error: error.message || "Terjadi kesalahan pada server",
        details:
          process.env.NODE_ENV === "development"
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack?.substring(0, 300),
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}