'use client';

import { useState, useCallback } from 'react';

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="my-2.5 rounded-xl border border-black/[0.06] bg-gray-900 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/80 border-b border-white/5">
        <span className="text-[10px] sm:text-xs text-gray-400 font-mono">{language || 'code'}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          {copied ? (
            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>Copied!</>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>Copy</>
          )}
        </button>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <pre className="px-3 sm:px-4 py-3 text-[11px] sm:text-xs leading-relaxed"><code className="text-green-400 font-mono whitespace-pre">{code}</code></pre>
      </div>
    </div>
  );
}

export default function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-[13px] sm:text-sm leading-relaxed">
      {parts.map((part, i) => {
        const m = part.match(/^```(\w*)\n?([\s\S]*?)```$/);
        if (m) return <CodeBlock key={i} code={m[2].trim()} language={m[1]} />;
        const inlines = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>{inlines.map((s, j) =>
            s.startsWith('`') && s.endsWith('`')
              ? <code key={j} className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-mono text-[11px] sm:text-xs border border-orange-100">{s.slice(1, -1)}</code>
              : <span key={j} className="whitespace-pre-wrap break-words">{s}</span>
          )}</span>
        );
      })}
    </div>
  );
}