// src/components/chat/InputArea.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ModelType } from "@/types";

interface InputAreaProps {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading: boolean;
  selectedModel: ModelType;
}

export function InputArea({
  onSendMessage,
  isLoading,
  selectedModel,
}: InputAreaProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 160; // ~6 lines
      textarea.style.height =
        Math.min(textarea.scrollHeight, maxHeight) + "px";
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Re-focus after loading completes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isLoading]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed, files.length > 0 ? files : undefined);
    setInput("");
    setFiles([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, files, isLoading, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for new line
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (selected) {
        setFiles((prev) => [...prev, ...Array.from(selected)]);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const modelPlaceholders: Record<ModelType, string> = {
    claude: "Tanya Claude sesuatu...",
    llama: "Tanya LLaMA sesuatu...",
    deepseek: "Tanya DeepSeek sesuatu...",
  };

  return (
    <div className="border-t border-white/[0.06] bg-black/20 backdrop-blur-xl">
      {/* File Preview */}
      {files.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/8 border border-orange-500/15 rounded-lg"
            >
              <svg
                className="w-3.5 h-3.5 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span className="text-xs text-orange-300 max-w-[150px] truncate">
                {file.name}
              </span>
              <button
                onClick={() => removeFile(index)}
                className="text-white/30 hover:text-red-400 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="p-3 sm:p-4">
        <div
          className="
            flex items-end gap-2 p-2
            bg-white/[0.04] border border-white/[0.08]
            rounded-2xl
            input-glow
            transition-all duration-200
            focus-within:border-orange-500/25
          "
        >
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="
              flex-shrink-0 w-9 h-9 rounded-xl
              flex items-center justify-center
              text-white/30 hover:text-orange-400 hover:bg-orange-500/10
              transition-all duration-200
              disabled:opacity-30 disabled:cursor-not-allowed
              mb-0.5
            "
            title="Upload file"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".txt,.md,.pdf,.csv,.json,.js,.ts,.tsx,.jsx,.py,.java,.html,.css"
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modelPlaceholders[selectedModel]}
            disabled={isLoading}
            rows={1}
            className="
              flex-1 bg-transparent text-white/90 text-sm
              placeholder:text-white/25
              resize-none outline-none
              min-h-[36px] max-h-[160px]
              py-2 px-1
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          />

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className={`
              flex-shrink-0 w-9 h-9 rounded-xl
              flex items-center justify-center
              transition-all duration-200 mb-0.5
              ${
                input.trim() && !isLoading
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 active:scale-95"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }
            `}
            title="Kirim pesan (Enter)"
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Footer Hint */}
        <p className="text-[10px] text-white/15 text-center mt-2">
          Enter untuk kirim · Shift+Enter untuk baris baru
        </p>
      </div>
    </div>
  );
}