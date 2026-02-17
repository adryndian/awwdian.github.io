// src/components/chat/ChatContainer.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageList } from "./MessageList";
import { InputArea } from "./InputArea";
import { ModelSelector } from "./ModelSelector";
import { CostToast } from "./CostToast";
import { sendMessage } from "@/app/actions/chat";
import type { Message, ModelType } from "@/types";

// ============================================
// [FIX #2] AI Activity Status Types
// ============================================
type AiStatus =
  | "idle"
  | "connecting"
  | "thinking"
  | "generating"
  | "error";

const STATUS_LABELS: Record<AiStatus, string> = {
  idle: "",
  connecting: "Menghubungi",
  thinking: "Sedang berpikir",
  generating: "Menulis jawaban",
  error: "Terjadi kesalahan",
};

const MODEL_DISPLAY_NAMES: Record<ModelType, string> = {
  claude: "Claude 3.5 Sonnet",
  llama: "LLaMA 3.1",
  deepseek: "DeepSeek R1",
};

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>("claude");
  const [cost, setCost] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // [FIX #2] AI activity status
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");

  // [FIX #1] Ref for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // [FIX #1] Auto-scroll to bottom when new message arrives
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Also scroll when loading state changes (indicator appears/disappears)
  useEffect(() => {
    if (isLoading) {
      scrollToBottom();
    }
  }, [isLoading, scrollToBottom]);

  const handleSendMessage = async (
    content: string,
    files?: File[]
  ) => {
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

    // [FIX #2] Stage 1: Connecting
    setAiStatus("connecting");

    try {
      // [FIX #2] Stage 2: Thinking
      await new Promise((r) => setTimeout(r, 500));
      setAiStatus("thinking");

      const response = await sendMessage(
        selectedModel,
        content,
        messages,
        files
      );

      // [FIX #2] Stage 3: Generating
      setAiStatus("generating");

      if (response.error) {
        throw new Error(response.error);
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.content || "Maaf, tidak ada respons.",
        timestamp: new Date(),
        model: selectedModel,
        cost: response.cost,
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (response.cost) {
        setCost(response.cost);
        setTimeout(() => setCost(null), 5000);
      }
    } catch (err: any) {
      setAiStatus("error");
      const errorMsg = err.message || "Terjadi kesalahan";
      setError(errorMsg);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ **Error:** ${errorMsg}`,
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Small delay before clearing status so user sees final state
      setTimeout(() => setAiStatus("idle"), 800);
    }
  };

  return (
    <>
      {/* ============================================
          [FIX #1] CRITICAL LAYOUT FIX
          - h-full + flex + flex-col = full height container
          - overflow-hidden on shell prevents double scroll
          ============================================ */}
      <div className="flex flex-col h-full overflow-hidden">

        {/* Header with Model Selector */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">
                Beckrock AI
              </h1>
              <p className="text-white/40 text-[11px]">
                Multi-Model Chat
              </p>
            </div>
          </div>
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isLoading}
          />
        </header>

        {/* ============================================
            [FIX #2] AI ACTIVITY TOAST / INDICATOR
            Shows what AI is currently doing
            ============================================ */}
        {aiStatus !== "idle" && (
          <div
            className={`
              flex-shrink-0 flex items-center gap-3 px-4 py-2
              border-b transition-all duration-300 animate-in slide-in-from-top-2
              ${aiStatus === "error"
                ? "bg-red-500/5 border-red-500/10"
                : "bg-orange-500/5 border-orange-500/10"
              }
            `}
          >
            {/* Spinner or Error Icon */}
            {aiStatus === "error" ? (
              <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-400 text-[10px]">✕</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            )}

            {/* Status Text */}
            <span
              className={`text-xs font-medium ${
                aiStatus === "error" ? "text-red-400" : "text-orange-400"
              }`}
            >
              <strong>{MODEL_DISPLAY_NAMES[selectedModel]}</strong>
              {" -- "}
              {STATUS_LABELS[aiStatus]}...
            </span>
          </div>
        )}

        {/* ============================================
            [FIX #1] CHAT MESSAGES AREA
            CRITICAL: min-h-0 allows flex child to scroll
            flex-1 takes remaining space
            overflow-y-auto enables scrolling
            ============================================ */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 overflow-y-auto"
        >
          <div className="px-4 py-4">
            {messages.length === 0 ? (
              <WelcomeScreen onQuickAction={handleSendMessage} />
            ) : (
              <MessageList messages={messages} isLoading={isLoading} />
            )}

            {/* [FIX #1] Scroll anchor - MUST be inside scrollable area */}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* ============================================
            [FIX #1] INPUT AREA
            flex-shrink-0 = never collapse
            position: relative (NOT fixed/absolute)
            Always visible at bottom
            ============================================ */}
        <div className="flex-shrink-0">
          <InputArea
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedModel={selectedModel}
          />
        </div>
      </div>

      {/* Cost Toast */}
      {cost !== null && <CostToast cost={cost} />}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 backdrop-blur-xl animate-in slide-in-from-top-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </>
  );
}

// ============================================
// Welcome Screen Component
// ============================================
function WelcomeScreen({
  onQuickAction,
}: {
  onQuickAction: (msg: string) => void;
}) {
  const suggestions = [
    "Jelaskan tentang AWS Bedrock",
    "Buatkan kode React component",
    "Apa itu machine learning?",
    "Bantu saya debug kode ini",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/25">
        <span className="text-4xl">🤖</span>
      </div>
      <h2 className="text-white text-xl font-bold mb-2">
        Selamat Datang di Beckrock AI
      </h2>
      <p className="text-white/50 text-sm max-w-md mb-8">
        Chat dengan berbagai model AI -- Claude, LLaMA, dan DeepSeek.
        Pilih model di kanan atas untuk memulai.
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {suggestions.map((text) => (
          <button
            key={text}
            onClick={() => onQuickAction(text)}
            className="px-4 py-2 bg-orange-500/8 border border-orange-500/15
              rounded-full text-orange-400 text-xs font-medium
              hover:bg-orange-500/15 hover:border-orange-500/25
              transition-all duration-200 hover:-translate-y-0.5"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}