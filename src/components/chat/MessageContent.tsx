'use client';

import { useState, useCallback } from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="my-3 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="text-[10px] sm:text-xs text-white/40 font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-xs text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Copy
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <pre className="px-3 sm:px-4 py-3 text-[11px] sm:text-xs leading-relaxed">
          <code className="text-green-300/90 font-mono whitespace-pre">{code}</code>
        </pre>
      </div>
    </div>
  );
}

interface MessageContentProps {
  content: string;
}

export default function MessageContent({ content }: MessageContentProps) {
  // Parse markdown-style code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="text-xs sm:text-sm leading-relaxed">
      {parts.map((part, index) => {
        // Check if this part is a code block
        const codeMatch = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
        if (codeMatch) {
          const language = codeMatch[1] || 'code';
          const code = codeMatch[2].trim();
          return <CodeBlock key={index} code={code} language={language} />;
        }

        // Check for inline code
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={index}>
            {inlineParts.map((inline, i) => {
              if (inline.startsWith('`') && inline.endsWith('`')) {
                return (
                  <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-orange-300/90 font-mono text-[10px] sm:text-[11px]">
                    {inline.slice(1, -1)}
                  </code>
                );
              }
              // Render text with line breaks
              return (
                <span key={i} className="whitespace-pre-wrap break-words">
                  {inline}
                </span>
              );
            })}
          </span>
        );
      })}
    </div>
  );
}