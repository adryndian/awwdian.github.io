'use client';

import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Paperclip, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface PendingFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
}

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (files?: PendingFile[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  pendingFiles?: PendingFile[];
  onAddFiles?: (files: PendingFile[]) => void;
  onRemoveFile?: (id: string) => void;
}

export function InputArea({
  value,
  onChange,
  onSend,
  isLoading,
  disabled,
  pendingFiles = [],
  onAddFiles,
  onRemoveFile,
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  // Reset sending state when loading changes
  useEffect(() => {
    if (!isLoading && sendingState === 'sending') {
      setSendingState('sent');
      setTimeout(() => setSendingState('idle'), 300);
    }
  }, [isLoading, sendingState]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (!onAddFiles) return;
      const promises = acceptedFiles.map(
        (file) =>
          new Promise<PendingFile>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                id: Math.random().toString(36).slice(2),
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target?.result as string,
              });
            };
            reader.readAsText(file);
          })
      );
      Promise.all(promises).then(onAddFiles);
    },
    noClick: true,
    disabled: isLoading || disabled,
  });

  const handleSend = () => {
    if ((!value.trim() && pendingFiles.length === 0) || isLoading || disabled) return;
    
    // Immediate UI feedback
    setSendingState('sending');
    
    // Call onSend immediately without waiting
    requestAnimationFrame(() => {
      onSend(pendingFiles.length > 0 ? pendingFiles : undefined);
    });
  };

  const canSend =
    (value.trim().length > 0 || pendingFiles.length > 0) && !isLoading && !disabled;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 sm:pb-4">
      <div className="max-w-4xl mx-auto">
        {/* Floating container with glassmorphism */}
        <div
          {...getRootProps()}
          className={`glass-card relative transition-all duration-300 ${
            isFocused ? 'shadow-[var(--shadow-elevated)] scale-[1.005]' : 'shadow-[var(--shadow-glass)]'
          } ${isDragActive ? 'ring-2 ring-purple-400 ring-opacity-60' : ''}`}
        >
          <input {...getInputProps()} />

          {/* Drag overlay */}
          {isDragActive && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-purple-500/10 backdrop-blur-sm z-10 animate-scaleIn">
              <p className="text-sm font-semibold text-purple-700">
                Lepaskan file di sini
              </p>
            </div>
          )}

          {/* File attachments preview */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1.5 border-b border-purple-100 animate-slideInRight">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className="glass-input rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-medium text-gray-700 group"
                >
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  {onRemoveFile && (
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="text-gray-400 hover:text-gray-700 transition-smooth shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 px-2.5 sm:px-3 py-2">
            {/* Attach button */}
            <button
              type="button"
              onClick={open}
              disabled={isLoading || disabled}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-purple-50 transition-smooth disabled:opacity-40 shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isLoading ? 'AI sedang mengetik...' : 'Ketik pesan...'}
              disabled={isLoading || disabled}
              className="flex-1 bg-transparent text-[16px] text-gray-900 placeholder-gray-400 resize-none py-2 focus:outline-none leading-relaxed"
              rows={1}
              style={{ maxHeight: '160px', minHeight: '36px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
              className="flex-1 bg-transparent text-[16px] text-white placeholder-white/50 resize-none py-2.5 sm:py-3 focus:outline-none leading-relaxed"
              rows={1}
              style={{ maxHeight: '200px', minHeight: '40px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Send button with state animation */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                canSend
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-md shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              } ${sendingState === 'sending' ? 'animate-pulse' : ''} ${
                sendingState === 'sent' ? 'scale-110' : ''
              }`}
              title="Send (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          {/* Hint */}
          <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-gray-500">
            <span>Enter kirim • Shift+Enter baris baru</span>
            {value.length > 0 && <span>{value.length} karakter</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
