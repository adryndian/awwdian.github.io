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
                       bg-white/10 border border-white/15">
        {value}
      </code>
    );
  }

  /* Block code */
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2
                      bg-white/8 border-b border-white/8">
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

      {/* Code */}
      <div className="overflow-x-auto">
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
          }}
          codeTagProps={{
            style: {
              fontFamily: '"Fira Code","Cascadia Code","JetBrains Mono",monospace',
              whiteSpace: 'pre',
            },
          }}
          showLineNumbers={value.split('\n').length > 5}
          lineNumberStyle={{ opacity: 0.35, fontSize: '11px', minWidth: '2.5em' }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
