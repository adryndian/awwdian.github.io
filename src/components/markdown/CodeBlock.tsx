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

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-gray-100 text-[13px] font-mono text-rose-600 border border-gray-200">
        {value}
      </code>
    );
  }

  return (
    <div className="group relative my-2 rounded-lg overflow-hidden border border-gray-200/50 shadow-sm w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 transition-all text-[10px] font-medium text-gray-600 hover:text-gray-900 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code with scroll - constrained to container */}
      <div className="relative w-full overflow-x-auto">
        <div style={{ maxWidth: '100%' }}>
          <SyntaxHighlighter
            language={language || 'text'}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: '0.75rem',
              fontSize: '11px',
              lineHeight: '1.5',
              background: '#1e1e2e',
              maxHeight: '320px',
              overflowY: 'auto',
              width: '100%',
            }}
            codeTagProps={{
              style: {
                fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
                whiteSpace: 'pre',
                wordBreak: 'normal',
                overflowWrap: 'normal',
              },
            }}
            wrapLongLines={false}
            showLineNumbers={value.split('\n').length > 5}
            lineNumberStyle={{
              minWidth: '2.5em',
              paddingRight: '1em',
              fontSize: '10px',
              opacity: 0.5,
            }}
          >
            {value}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
