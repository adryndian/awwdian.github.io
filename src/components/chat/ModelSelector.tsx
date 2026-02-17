// src/components/chat/ModelSelector.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import type { ModelType } from "@/types";

interface ModelConfig {
  id: ModelType;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
}

const MODELS: ModelConfig[] = [
  {
    id: "claude",
    name: "Claude 3.5 Sonnet",
    description: "Analisis mendalam & akurat",
    icon: "C",
    iconBg: "bg-gradient-to-br from-amber-600 to-amber-900",
  },
  {
    id: "llama",
    name: "LLaMA 3.1",
    description: "Open-source & cepat",
    icon: "L",
    iconBg: "bg-gradient-to-br from-purple-600 to-purple-900",
  },
  {
    id: "deepseek",
    name: "DeepSeek R1",
    description: "Reasoning & coding",
    icon: "D",
    iconBg: "bg-gradient-to-br from-sky-500 to-sky-800",
  },
];

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  disabled?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold
          border transition-all duration-200
          ${
            disabled
              ? "opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-white/40"
              : "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/18 hover:border-orange-500/30"
          }
        `}
      >
        <span
          className={`w-5 h-5 rounded-md ${currentModel.iconBg} flex items-center justify-center text-white text-[10px] font-bold`}
        >
          {currentModel.icon}
        </span>
        <span className="hidden sm:inline">{currentModel.name}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute top-full right-0 mt-2 w-72
            bg-black/90 backdrop-blur-2xl
            border border-orange-500/15 rounded-2xl
            shadow-2xl shadow-black/50
            p-1.5 z-50
            animate-slide-down
          "
        >
          <div className="px-3 py-2 mb-1">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
              Pilih Model AI
            </p>
          </div>

          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelChange(model.id);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                transition-all duration-200 border
                ${
                  selectedModel === model.id
                    ? "bg-orange-500/12 border-orange-500/20"
                    : "border-transparent hover:bg-white/5"
                }
              `}
            >
              {/* Model Icon */}
              <span
                className={`
                  w-9 h-9 rounded-lg ${model.iconBg}
                  flex items-center justify-center
                  text-white text-xs font-bold flex-shrink-0
                  ${selectedModel === model.id ? "shadow-lg" : ""}
                `}
              >
                {model.icon}
              </              >
                {model.icon}
              </span>

              {/* Model Info */}
              <div className="flex-1 text-left">
                <p
                  className={`text-sm font-semibold ${
                    selectedModel === model.id
                      ? "text-orange-400"
                      : "text-white/70"
                  }`}
                >
                  {model.name}
                </p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  {model.description}
                </p>
              </div>

              {/* Check Icon */}
              {selectedModel === model.id && (
                <svg
                  className="w-4 h-4 text-orange-500 flex-shrink-0"
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
              )}
            </button>
          ))}

          {/* Info Footer */}
          <div className="mt-1 px-3 py-2 border-t border-white/5">
            <p className="text-[10px] text-white/20">
              Powered by AWS Bedrock
            </p>
          </div>
        </div>
      )}
    </div>
  );
}