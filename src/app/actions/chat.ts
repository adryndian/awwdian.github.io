// src/app/actions/chat.ts
"use server";

import type { Message } from "@/types";
import type { ModelId } from "@/lib/models/config";

interface SendMessageResponse {
  content?: string;
  error?: string;
  cost?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export async function sendMessage(
  modelId: ModelId,
  message: string,
  history: Message[],
  files?: File[]
): Promise<SendMessageResponse> {
  try {
    // Build API URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    // Format history for API
    const formattedHistory = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    console.log(`[Action] Sending to ${modelId}: ${message.substring(0, 80)}...`);

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId,
        messages: formattedHistory.concat({ role: "user", content: message }),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Action] API Error:`, data);
      return {
        error:
          data.error ||
          `Server error (${response.status}): Gagal mendapatkan respons dari model`,
      };
    }

    if (!data.content) {
      return {
        error: `Model mengembalikan respons kosong. Coba lagi atau ganti model.`,
      };
    }

    return {
      content: data.content,
      cost: data.cost,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
    };
  } catch (error: any) {
        console.error(`[Action] Exception:`, error.message);

    // Handle specific error types
    if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED")) {
      return {
        error: "Tidak dapat terhubung ke server. Pastikan server berjalan.",
      };
    }

    if (error.message?.includes("timeout") || error.name === "AbortError") {
      return {
        error: `Timeout: Model terlalu lama merespon. Coba lagi atau gunakan model lain.`,
      };
    }

    return {
      error: error.message || "Terjadi kesalahan yang tidak diketahui",
    };
  }
}