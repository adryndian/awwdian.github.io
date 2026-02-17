// src/components/chat/ChatContainer.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageList } from "./MessageList";
import { InputArea } from "./InputArea";
import { ModelSelector } from "./ModelSelector";
import { CostToast } from "./CostToast";
import { sendMessage } from "@/app/actions/chat";
import type { Message } from "@/types";
import { MODELS, ModelId, DEFAULT_MODEL } from "@/lib/models/config";

export type ChatContainerProps = {
  userId?: string;
};

type AiStatus = "idle" | "connecting" | "thinking" | "generating" | "error";

const STATUS_LABELS: Record<AiStatus, string> = {
  idle: "",
  connecting: "Menghubungi model",
  thinking: "Sedang berpikir",
  generating: "Menulis jawaban",
  error: "Terjadi kesalahan",
};

// Mapping ModelId to display names
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'us.anthropic.claude-opus-4-6-v1': 'Claude Opus 4.6',
  'us.anthropic.claude-sonnet-4-0-v1': 'Claude Sonnet 4.0',
  'us.meta.llama4-maverick-17b-instruct-v1': 'Llama 4 Maverick',
};

const suggestions = [
  "Bikinin prompt UGC untuk produk saya",
  "Buat storyboard 15 detik + VO Gen Z",
  "Optimalkan prompt agar wajah & outfit konsisten",
  "Analisa error deploy Vercel saya",
];

export function ChatContainer({ userId }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [cost, setCost] = useState<number | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const onQuickAction = (text: string) => {
    // auto-send quick suggestion
    void handleSend(text);
  };

  const handleSend = async (content: string, files?: File[]) => {
    setError(null);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
      model: selectedModel,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setAiStatus("connecting");

    try {
      // status progression (optional)
      await new Promise((r) => setTimeout(r, 250));
      setAiStatus("thinking");

      const res = await sendMessage(selectedModel, content, messages, files);

      setAiStatus("generating");

      if (res?.error) throw new Error(res.error);

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res?.content || "Maaf, tidak ada respons.",
        timestamp: new Date(),
        model: selectedModel,
        cost: res?.cost,
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (typeof res?.cost === "number") {
        setCost(res.cost);
        window.setTimeout(() => setCost(null), 4500);
      }
    } catch (e: any) {
      const msg = e?.message || "Terjadi kesalahan";
      setError(msg);
      setAiStatus("error");

      const errMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ **Error:** ${msg}`,
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsLoading(false);
      window.setTimeout(() => setAiStatus("idle"), 600);
    }
  };

  const showWelcome = messages.length === 0 && !isLoading;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm leading-tight">Beckrock AI</h1>
              <p className="text-white/40 text-[11px] truncate">
                {userId ? `User: ${userId.slice(0, 6)}…` : "Multi-Model Chat"}
              </p>
            </div>
          </div>

          <ModelSelector 
            models={Object.values(MODELS)} 
            currentModel={selectedModel} 
            onSelect={setSelectedModel} 
            disabled={isLoading} 
          />
        </header>

        {aiStatus !== "idle" && (
          <div
            className={[
              "flex items-center gap-3 px-4 py-2 border-b transition-all duration-300",
              aiStatus === "error" ? "bg-red-500/5 border-red-500/10" : "bg-orange-500/5 border-orange-500/10",
            ].join(" ")}
          >
            {aiStatus === "error" ? (
              <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-[10px]">✕</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            )}

            <p className={`text-xs ${aiStatus === "error" ? "text-red-300" : "text-orange-200"}`}>
              {STATUS_LABELS[aiStatus]}
              {aiStatus !== "error" ? ` • ${MODEL_DISPLAY_NAMES[selectedModel]}` : ""}
            </p>

            {error ? <span className="text-[11px] text-red-300/80 truncate">{error}</span> : null}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {showWelcome ? (
            <div className="h-full flex flex-col items-center justify-center px-6 text-center">
              <h2 className="text-white font-semibold text-lg mb-2">Selamat Datang di Beckrock AI</h2>
              <p className="text-white/50 text-sm max-w-md mb-8">
                Chat dengan berbagai model AI -- Claude, LLaMA, dan DeepSeek. Pilih model di kanan atas untuk memulai.
              </p>

              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestions.map((text) => (
                  <button
                    key={text}
                    onClick={() => onQuickAction(text)}
                    className="px-4 py-2 bg-orange-500/10 border border-orange-500/20
                      rounded-full text-orange-300 text-xs font-medium
                      hover:bg-orange-500/15 hover:border-orange-500/30
                      transition-all duration-200 hover:-translate-y-0.5"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <MessageList messages={messages} isLoading={isLoading} />
              <div ref={endRef} />
            </>
          )}
        </div>

        <div className="flex-shrink-0">
          <InputArea
  onSendMessage={(content, files) => void handleSend(content, files)}
  isLoading={isLoading}
  selectedModel={selectedModel}
/>
        </div>
      </div>

      {cost != null ? <CostToast cost={cost} /> : null}
    </>
  );
}

export default ChatContainer;