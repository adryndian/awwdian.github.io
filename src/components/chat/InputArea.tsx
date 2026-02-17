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
    requestAnimationFrame(() => {
      onSend(pendingFiles.length > 0 ? pendingFiles : undefined);
    });
  };

  const canSend =
    (value.trim().length > 0 || pendingFiles.length > 0) && !isLoading && !disabled;

  return (
    /*
     * FIX: InputArea harus fixed bottom-0.
     * Pastikan z-index cukup tinggi (z-30) tapi tidak menghalangi modal/dropdown.
     * `pb-safe` untuk iPhone notch / home indicator.
     */
    <div className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 sm:pb-4"
         style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="max-w-4xl mx-auto">
        {/* Floating container */}
        <div
          {...getRootProps()}
          className={`glass-card relative transition-all duration-300 ${
            isFocused
              ? 'shadow-[var(--shadow-elevated)] scale-[1.005]'
              : 'shadow-[var(--shadow-glass)]'
          } ${isDragActive ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}`}
        >
          <input {...getInputProps()} />

          {/* Drag overlay */}
          {isDragActive && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-blue-500/20 backdrop-blur-sm z-10 animate-scaleIn">
              <p className="text-sm font-semibold text-white drop-shadow">
                Lepaskan file di sini
              </p>
            </div>
          )}

          {/* File attachments preview */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1.5 border-b border-white/10 animate-slideInRight">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className="glass-input rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium text-white/90 group"
                >
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  {onRemoveFile && (
                    <button
                      onClick={() => onRemoveFile(file.id)}
                      className="text-white/50 hover:text-white transition-smooth shrink-0"
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
              className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-smooth disabled:opacity-40 shrink-0 mb-0.5"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/*
             * ─── FIX KRITIS: iOS Safari Auto-Zoom ────────────────────────────
             * iOS Safari OTOMATIS zoom halaman ketika user tap/focus ke input
             * yang memiliki font-size < 16px.
             *
             * SEBELUM (BUGGY):
             *   className="... text-[15px] ..."
             *   → 15px < 16px = iOS zoom
             *
             * SESUDAH (FIXED):
             *   style={{ fontSize: '16px' }}
             *   → 16px = tidak ada zoom
             *
             * Catatan: Tailwind class text-base = 16px juga bisa dipakai,
             * tapi inline style lebih explicit dan tidak bisa di-override.
             * ─────────────────────────────────────────────────────────────── */
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isLoading ? 'AI sedang mengetik...' : 'Ketik pesan...'}
              disabled={isLoading || disabled}
              rows={1}
              style={{
                maxHeight: '200px',
                minHeight: '40px',
                fontSize: '16px', // ← FIX: minimum 16px untuk cegah iOS auto-zoom
              }}
              className="flex-1 bg-transparent text-white placeholder-white/50 resize-none py-2.5 sm:py-3 focus:outline-none leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[14px] flex items-center justify-center shrink-0 mb-0.5 transition-all duration-300 ${
                canSend
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              } ${sendingState === 'sending' ? 'animate-pulse' : ''} ${
                sendingState === 'sent' ? 'scale-110' : ''
              }`}
              title="Send (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </button>
          </div>

          {/* Hint */}
          <div className="px-3 pb-2.5 flex items-center justify-between text-[11px] text-white/40">
            <span>Enter kirim • Shift+Enter baris baru</span>
            {value.length > 0 && <span>{value.length} karakter</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
