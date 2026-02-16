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
    setSendingState('sending');
    onSend(pendingFiles.length > 0 ? pendingFiles : undefined);
  };

  const canSend =
    (value.trim().length > 0 || pendingFiles.length > 0) && !isLoading && !disabled;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 sm:pb-6">
      <div className="max-w-4xl mx-auto">
        {/* Floating container with glassmorphism */}
        <div
          {...getRootProps()}
          className={`glass-card relative transition-all duration-300 ${
            isFocused ? 'shadow-[var(--shadow-elevated)] scale-[1.01]' : 'shadow-[var(--shadow-glass)]'
          } ${isDragActive ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}`}
        >
          <input {...getInputProps()} />

          {/* Drag overlay */}
          {isDragActive && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-blue-500/20 backdrop-blur-sm z-10 animate-scaleIn">
              <p className="text-base font-semibold text-white drop-shadow">
                Lepaskan file di sini
              </p>
            </div>
          )}

          {/* File attachments preview */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3 pb-2 border-b border-white/10 animate-slideInRight">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className="glass-input rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs font-medium text-white/90 group"
                >
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  {onRemoveFile && (
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="text-white/50 hover:text-white transition-smooth shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 sm:gap-3 px-3 sm:px-4 py-3">
            {/* Attach button */}
            <button
              type="button"
              onClick={open}
              disabled={isLoading || disabled}
              className="p-2.5 sm:p-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-smooth disabled:opacity-40 shrink-0 mb-0.5"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
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
              className="flex-1 bg-transparent text-[15px] text-white placeholder-white/50 resize-none py-2.5 sm:py-3 focus:outline-none leading-relaxed"
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
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] flex items-center justify-center shrink-0 mb-0.5 transition-all duration-300 ${
                canSend
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              } ${sendingState === 'sending' ? 'animate-pulse' : ''} ${
                sendingState === 'sent' ? 'scale-110' : ''
              }`}
              title="Send (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Hint */}
          <div className="px-4 pb-3 flex items-center justify-between text-[11px] text-white/40">
            <span>Enter kirim • Shift+Enter baris baru</span>
            {value.length > 0 && <span>{value.length} karakter</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
