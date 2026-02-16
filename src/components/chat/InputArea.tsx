'use client';

import { useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, X } from 'lucide-react';
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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }, [value]);

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
    onSend(pendingFiles.length > 0 ? pendingFiles : undefined);
  };

  const canSend = (value.trim().length > 0 || pendingFiles.length > 0) && !isLoading && !disabled;

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        {...getRootProps()}
        className={`relative bg-white border rounded-2xl shadow-[var(--shadow-md)] transition-all ${
          isDragActive
            ? 'border-[var(--accent-blue)] bg-blue-50'
            : 'border-[var(--border-subtle)]'
        }`}
      >
        <input {...getInputProps()} />

        {isDragActive && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-blue-50/90 z-10">
            <p className="text-sm font-medium text-blue-600">Lepaskan file di sini</p>
          </div>
        )}

        {/* File attachments preview */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {pendingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <span className="truncate max-w-[120px]">{file.name}</span>
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 px-3 py-2">
          {/* Attach button */}
          <button
            type="button"
            onClick={open}
            disabled={isLoading || disabled}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-gray-100 transition-all disabled:opacity-40 shrink-0 mb-0.5"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ketik pesan..."
            disabled={isLoading || disabled}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none py-2 focus:outline-none leading-relaxed"
            rows={1}
            style={{ maxHeight: '180px', minHeight: '36px' }}
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
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-all ${
              canSend
                ? 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white shadow-sm'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
            title="Send (Enter)"
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Hint */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-muted)]">
            Enter untuk kirim · Shift+Enter untuk baris baru
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {value.length > 0 && `${value.length} karakter`}
          </p>
        </div>
      </div>
    </div>
  );
}
