// src/components/markdown/CodeBlock.tsx
"use client";

import { useState, useCallback } from "react";

interface CodeBlockProps {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-[11px] font-medium text-orange-400/70 uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium
            transition-all duration-200
            ${
              copied
                ? "bg-green-500/15 text-green-400"
                : "bg-white/5 text-white/35 hover:bg-orange-500/10 hover:text-orange-400"
            }
          `}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Tersalin!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Salin
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="!m-0 !rounded-none !border-0 p-4 overflow-x-auto bg-black/40">
        <code className={`language-${language} text-xs leading-relaxed text-white/80`}>
          {code}
        </code>
      </pre>
    </div>
  );
}