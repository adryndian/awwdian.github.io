// src/components/chat/MessageList.tsx
"use client";

import { useState, useCallback } from "react";
import type { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/markdown/CodeBlock";

// ============================================
// Copy Button Component
// ============================================
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
        transition-all duration-200 border
        ${
          copied
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-white/5 border-white/10 text-white/40 hover:bg-orange-500/10 hover:border-orange-500/20 hover:text-orange-400"
        }
      `}
      title={copied ? "Tersalin!" : "Salin teks"}
    >
      {copied ? (
        <>
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Tersalin!
        </>
      ) : (
        <>
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Salin
        </>
      )}
    </button>
  );
}

// ============================================
// Typing Indicator (shown while AI is generating)
// ============================================
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
        <span className="text-white text-xs font-bold">AI</span>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "0.6s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
            style={{ animationDelay: "150ms", animationDuration: "0.6s" }}
          />
          <span
            className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
            style={{ animationDelay: "300ms", animationDuration: "0.6s" }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Model Badge
// ============================================
function ModelBadge({ model }: { model: string }) {
  const config: Record<string, { label: string; color: string }> = {
    claude: { label: "Claude", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    llama: { label: "LLaMA", color: "bg-purple-500/15 text-purple-400 border-purple-500/20" },
    deepseek: { label: "DeepSeek", color: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
  };

  const { label, color } = config[model] || {
    label: model,
    color: "bg-white/10 text-white/50 border-white/10",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${color}`}
    >
      {label}
    </span>
  );
}

// ============================================
// Single Message Component
// ============================================
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 mb-5 group ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
          ${
            isUser
              ? "bg-white/10"
              : "bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/20"
          }
        `}
      >
        <span className="text-white text-xs font-bold">
          {isUser ? "U" : "AI"}
        </span>
      </div>

      {/* Content */}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {/* Model badge for AI messages */}
        {!isUser && message.model && (
          <div className="mb-1.5 flex items-center gap-2">
            <ModelBadge model={message.model} />
            <span className="text-[10px] text-white/25">
              {new Date(message.timestamp).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm leading-relaxed
            ${
              isUser
                ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm"
                : "bg-white/[0.06] border border-white/[0.08] text-white/85 rounded-tl-sm"
            }
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:my-2 prose-p:leading-relaxed
              prose-headings:text-white prose-headings:font-bold
              prose-strong:text-orange-300
              prose-code:text-orange-300 prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs
              prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
              prose-a:text-orange-400 prose-a:no-underline hover:prose-a:underline
              prose-li:my-0.5
              prose-ul:my-2 prose-ol:my-2
              prose-blockquote:border-orange-500/30 prose-blockquote:text-white/60
              prose-hr:border-white/10
              prose-table:text-sm
              prose-th:text-orange-300 prose-th:border-white/10
              prose-td:border-white/10
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");

                    if (match) {
                      return (
                        <CodeBlock
                          language={match[1]}
                          code={codeString}
                        />
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* ============================================
            [FIX #5] COPY BUTTON - Only for AI messages
            Shows on hover with smooth transition
            ============================================ */}
        {!isUser && (
          <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyButton text={message.content} />

            {/* Optional: Additional action buttons */}
            <button
              onClick={() => {
                // Regenerate functionality placeholder
                console.log("Regenerate message:", message.id);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
                bg-white/5 border border-white/10 text-white/40
                hover:bg-orange-500/10 hover:border-orange-500/20 hover:text-orange-400
                transition-all duration-200"
              title="Buat ulang jawaban"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Ulangi
            </button>
          </div>
        )}

        {/* Timestamp for user messages */}
        {isUser && (
          <span className="text-[10px] text-white/25 mt-1 mr-1">
            {new Date(message.timestamp).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Message List (Main Export)
// ============================================
interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="space-y-1">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Typing indicator when AI is processing */}
      {isLoading && <TypingIndicator />}
    </div>
  );
}