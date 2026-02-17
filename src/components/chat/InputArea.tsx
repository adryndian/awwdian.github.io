'use client';

import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Paperclip, X, Loader2, ChevronDown, Zap, Brain, Cpu, Flame, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { ModelId } from '@/types';
import { MODELS } from '@/lib/models/config';
import { posthog } from '@/lib/posthog';

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
  // Model selector props — dipindahkan dari header ke input area
  selectedModel: ModelId;
  onModelChange: (model: ModelId) => void;
}

// Icon map untuk setiap model
const modelIcons: Partial<Record<ModelId, React.ElementType>> = {
  'claude-sonnet-4-5': Zap,
  'claude-opus-4-6':   Brain,
  'deepseek-r1':       Cpu,
  'llama-4-maverick':  Flame,
};

// ─── Mini Model Selector (embedded di dalam input box) ──────────────────────
function ModelPill({
  selected,
  onSelect,
  disabled,
}: {
  selected: ModelId;
  onSelect: (id: ModelId) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedModel = MODELS[selected];
  const Icon = modelIcons[selected] || Zap;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: ModelId) => {
    posthog.capture('model_selected_from_input', { modelId: id });
    onSelect(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Pill trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-input
                   text-xs font-semibold text-white/80 hover:text-white
                   hover:bg-white/12 transition-smooth disabled:opacity-40
                   disabled:cursor-not-allowed border border-white/10
                   whitespace-nowrap"
      >
        {/* Color dot */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: selectedModel?.color || '#a78bfa' }}
        />
        {/* Model name — truncate jika panjang */}
        <span className="max-w-[90px] truncate">{selectedModel?.name || 'Model'}</span>
        <ChevronDown
          className="w-3 h-3 text-white/40 transition-transform shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown — muncul ke ATAS karena input ada di bawah */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 glass-dark rounded-2xl
                        shadow-[var(--shadow-elevated)] z-50 overflow-hidden py-2
                        border border-white/10 animate-scaleIn">
          <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest px-4 pt-1 pb-2">
            Pilih Model
          </p>
          {(Object.keys(MODELS) as ModelId[]).map((id) => {
            const m = MODELS[id];
            const ModelIcon = modelIcons[id] || Zap;
            const active = selected === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-smooth ${
                  active ? 'bg-white/15' : 'hover:bg-white/8'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${m.color}25` }}
                >
                  <ModelIcon className="w-3.5 h-3.5" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                  <p className="text-[11px] text-white/40 truncate">{m.description}</p>
                </div>
                {active && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: m.color }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Backdrop untuk tutup dropdown */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}

// ─── Main InputArea ──────────────────────────────────────────────────────────
export function InputArea({
  value,
  onChange,
  onSend,
  isLoading,
  disabled,
  pendingFiles = [],
  onAddFiles,
  onRemoveFile,
  selectedModel,
  onModelChange,
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

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
    <div
      className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-3 sm:pb-4"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-4xl mx-auto">
        <div
          {...getRootProps()}
          className={`glass-card relative transition-all duration-300 ${
            isFocused
              ? 'shadow-[var(--shadow-elevated)] scale-[1.005]'
              : 'shadow-[var(--shadow-glass)]'
          } ${isDragActive ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}`}
        >
          <input {...getInputProps()} />

          {isDragActive && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-blue-500/20 backdrop-blur-sm z-10 animate-scaleIn">
              <p className="text-sm font-semibold text-white drop-shadow">
                Lepaskan file di sini
              </p>
            </div>
          )}

          {/* ── TOP ROW: Model Selector Pill ──────────────────────────── */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <ModelPill
              selected={selectedModel}
              onSelect={onModelChange}
              disabled={isLoading}
            />
            {/* Status generating di kanan pill */}
            {isLoading && (
              <span className="text-[11px] text-violet-300 font-medium flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                Generating…
              </span>
            )}
          </div>

          {/* Divider tipis */}
          <div className="mx-3 border-t border-white/8" />

          {/* File attachments preview */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-1 animate-slideInRight">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className="glass-input rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium text-white/90"
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

          {/* ── INPUT ROW ─────────────────────────────────────────────── */}
          <div className="flex items-end gap-2 px-2.5 sm:px-3 py-2">
            {/* Attach */}
            <button
              type="button"
              onClick={open}
              disabled={isLoading || disabled}
              className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10
                         transition-smooth disabled:opacity-40 shrink-0 mb-0.5"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Textarea — font-size 16px WAJIB untuk cegah iOS auto-zoom */}
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
                fontSize: '16px',
              }}
              className="flex-1 bg-transparent text-white placeholder-white/50
                         resize-none py-2.5 sm:py-3 focus:outline-none leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* ── Send Button: 30% lebih besar dari sebelumnya ──────────
                Sebelum: w-9 h-9 sm:w-10 sm:h-10 (36px / 40px)
                Sesudah: w-12 h-12 sm:w-13 sm:h-13 (48px / 52px) = ~30% lebih besar
            */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-[16px]
                          flex items-center justify-center shrink-0 mb-0.5
                          transition-all duration-300 ${
                canSend
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              } ${sendingState === 'sending' ? 'animate-pulse' : ''} ${
                sendingState === 'sent' ? 'scale-110' : ''
              }`}
              title="Send (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
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
