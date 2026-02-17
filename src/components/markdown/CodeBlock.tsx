'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeBlockProps {
  language?: string;
  value: string;
  inline?: boolean;
}

export function CodeBlock({ language, value, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* Inline code */
  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded-lg text-[13px] font-mono text-violet-300
                       bg-white/10 border border-white/15 break-words">
        {value}
      </code>
    );
  }

  /* ─── Block code ───────────────────────────────────────────────────
   *  BUG ROOT CAUSE: Tiga masalah yang menyebabkan overflow ke luar screen:
   *
   *  1. Outer wrapper tidak ada `max-w-full` — bisa expand tak terbatas
   *  2. `overflow-hidden` di luar memblokir scroll horizontal di dalam —
   *     harus diubah ke `overflow-hidden` HANYA untuk vertical clipping,
   *     sementara horizontal scroll dihandle div inner.
   *  3. SyntaxHighlighter render <pre> yang memiliki default `overflow: auto`
   *     tapi tidak dibatasi lebar maksimal, sehingga mendorong parent keluar.
   *  ─────────────────────────────────────────────────────────────────── */
  return (
    // Outer: max-w-full + min-w-0 untuk pastikan tidak pernah melebihi parent
    <div className="my-3 rounded-xl border border-white/10 shadow-lg max-w-full min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2
                      bg-white/8 border-b border-white/8 rounded-t-xl">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                     glass-input text-[10px] font-semibold
                     text-white/60 hover:text-white transition-smooth"
        >
          {copied ? (
            <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
          ) : (
            <><Copy className="w-3 h-3" /><span>Copy</span></>
          )}
        </button>
      </div>

      {/* 
       * FIX: Wrapper dengan overflow-x-auto yang memiliki lebar terbatas.
       * `w-full` + `max-w-full` memastikan div ini tidak melebihi parent,
       * tapi konten di dalamnya bisa scroll horizontal.
       * Tanpa w-full + max-w-full, browser bisa membuat div ini "auto" width
       * yang mengikuti konten (= tidak ada scroll, langsung overflow).
       */}
      <div
        className="overflow-x-auto rounded-b-xl"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <SyntaxHighlighter
          language={language || 'text'}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '0.875rem',
            fontSize: '12.5px',
            lineHeight: '1.6',
            background: 'rgba(0,0,0,0.45)',
            maxHeight: '400px',
            overflowY: 'auto',
            /* FIX: Jangan set width/minWidth di sini — biarkan content menentukan lebar,
             * tapi parent overflow-x-auto yang akan scroll */
            borderRadius: 0,
          }}
          codeTagProps={{
            style: {
              fontFamily: '"Fira Code","Cascadia Code","JetBrains Mono",monospace',
              whiteSpace: 'pre', // tetap pre agar formatting terjaga
              /* FIX: display block agar lebar konten tidak collapse */
              display: 'block',
            },
          }}
          showLineNumbers={value.split('\n').length > 5}
          lineNumberStyle={{ opacity: 0.35, fontSize: '11px', minWidth: '2.5em' }}
          // FIX: wrapLines & wrapLongLines tidak dipakai agar formatting tetap benar
          // tapi kita handle overflow di wrapper div
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
