'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DEFAULT_MODEL, isValidModelId, MODELS, getModelConfig } from '@/lib/models/config';
import type { Message, AiStatus, FileAttachment } from '@/types';
import MessageContent from './MessageContent';

interface ChatContainerProps {
  userId?: string;
  initialModel?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXT = [
  '.png','.jpg','.jpeg','.gif','.webp','.svg',
  '.ts','.tsx','.js','.jsx','.py','.java','.c','.cpp','.h',
  '.cs','.go','.rs','.rb','.php','.swift','.kt','.dart',
  '.html','.css','.scss','.sql','.sh','.bash',
  '.json','.yaml','.yml','.xml','.toml','.ini','.env',
  '.md','.txt','.csv','.log','.zip',
];

function getExt(n: string) { const i = n.lastIndexOf('.'); return i >= 0 ? n.substring(i).toLowerCase() : ''; }
function isImg(n: string) { return ['.png','.jpg','.jpeg','.gif','.webp'].includes(getExt(n)); }
function fmtSize(b: number) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; }

async function readText(f: File): Promise<string> { return new Promise((r, e) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.onerror = e; fr.readAsText(f); }); }
async function readB64(f: File): Promise<string> { return new Promise((r, e) => { const fr = new FileReader(); fr.onload = () => { const s = fr.result as string; r(s.split(',')[1] || s); }; fr.onerror = e; fr.readAsDataURL(f); }); }

async function processFile(f: File): Promise<FileAttachment> {
  if (isImg(f.name)) return { name: f.name, type: f.type, size: f.size, base64: await readB64(f), isImage: true };
  if (getExt(f.name) === '.zip') return { name: f.name, type: f.type, size: f.size, content: '[ZIP: ' + f.name + ' (' + fmtSize(f.size) + ')]', isImage: false };
  return { name: f.name, type: f.type, size: f.size, content: await readText(f), isImage: false };
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
      title="Copy message"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      )}
    </button>
  );
}

export function ChatContainer({ initialModel }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(isValidModelId(initialModel || '') ? initialModel! : DEFAULT_MODEL);
  const [cost, setCost] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // File handling
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const processed: FileAttachment[] = [];
    for (const f of arr) {
      if (f.size > MAX_FILE_SIZE) { setError(f.name + ' too large (max 10MB)'); continue; }
      if (!ALLOWED_EXT.includes(getExt(f.name))) { setError(getExt(f.name) + ' not supported'); continue; }
      try { processed.push(await processFile(f)); } catch { setError('Failed to read: ' + f.name); }
    }
    if (processed.length > 0) { setAttachedFiles((p) => [...p, ...processed]); setError(null); }
  }, []);

  // Build message with file context
  const buildMsg = useCallback((text: string, files: FileAttachment[]) => {
    if (files.length === 0) return text;
    let ctx = '';
    for (const f of files) {
      if (f.isImage) ctx += '\n\n[Image: ' + f.name + ']';
      else if (f.content) {
        ctx += '\n\n--- ' + f.name + ' ---\n';
        ctx += f.content.length > 50000 ? f.content.substring(0, 50000) + '\n...(truncated)' : f.content;
        ctx += '\n--- end ---';
      }
    }
    return text + ctx;
  }, []);

  // Stop generation
  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // Send message
  const handleSend = useCallback(async (content: string) => {
    if ((!content.trim() && attachedFiles.length === 0) || isLoading) return;
    setIsLoading(true); setError(null);
    const txt = content.trim() || 'Please analyze the attached file(s).';
    const full = buildMsg(txt, attachedFiles);
    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = '48px';

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: txt, timestamp: new Date(), files: attachedFiles.length > 0 ? [...attachedFiles] : undefined };
    setMessages((p) => [...p, userMsg]);
    setAttachedFiles([]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const mc = getModelConfig(selectedModel);
      const hasImgs = userMsg.files?.some((f) => f.isImage);

      const apiBody: Record<string, unknown> = { message: full, modelId: selectedModel, history };
      if (hasImgs && mc.supportsVision && mc.provider === 'Anthropic') {
        apiBody.images = userMsg.files?.filter((f) => f.isImage && f.base64).map((f) => ({ type: f.type || 'image/png', data: f.base64 }));
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
        signal: abort.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      if (!data.message) throw new Error('Empty response.');

      setMessages((p) => [...p, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: data.message,
        timestamp: new Date(), model: data.model || selectedModel, modelName: data.modelName,
        thinking: data.thinking, cost: data.cost,
      }]);
      setCost(data.cost ?? null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((p) => [...p, { id: (Date.now() + 1).toString(), role: 'assistant', content: '⏹️ Generation stopped by user.', timestamp: new Date(), modelName: getModelConfig(selectedModel).name }]);
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [messages, selectedModel, isLoading, attachedFiles, buildMsg]);

  // Edit & resend user message
  const handleEdit = useCallback((msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.role !== 'user') return;
    setEditingId(msgId);
    setEditValue(msg.content);
  }, [messages]);

  const handleEditSubmit = useCallback((msgId: string) => {
    if (!editValue.trim()) return;
    // Remove this message and all after it, then resend
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx < 0) return;
    setMessages(messages.slice(0, idx));
    setEditingId(null);
    // Small delay to let state update
    setTimeout(() => handleSend(editValue), 50);
  }, [messages, editValue, handleSend]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(inputValue); }
  }, [inputValue, handleSend]);

  const currentModel = getModelConfig(selectedModel);
  const allModels = Object.values(MODELS);

  return (
    <div
      className="flex flex-col h-[100dvh] bg-gray-950 text-white overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center"><div className="text-4xl mb-2">📎</div><p className="text-orange-400 font-medium">Drop files here</p></div>
        </div>
      )}

      {/* HEADER */}
      <header className="shrink-0 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xs sm:text-sm font-bold">B</div>
            <span className="font-semibold text-sm sm:text-base truncate">BeckRock AI</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <select value={selectedModel} onChange={(e) => { if (isValidModelId(e.target.value)) setSelectedModel(e.target.value); }} disabled={isLoading}
              className="max-w-[140px] sm:max-w-none px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-sm rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 truncate">
              {allModels.map((m) => (<option key={m.id} value={m.id} className="bg-gray-900">{m.name}</option>))}
            </select>
            <button onClick={() => { setMessages([]); setError(null); setCost(null); setAttachedFiles([]); }}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors" title="Clear">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3 px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg shadow-orange-500/20">AI</div>
              <h2 className="text-white/80 text-base sm:text-lg font-medium">BeckRock AI</h2>
              <p className="text-white/40 text-xs sm:text-sm max-w-sm">{currentModel.description}</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {allModels.map((m) => (
                  <button key={m.id} onClick={() => setSelectedModel(m.id)}
                    className={'rounded-full px-2.5 py-1 text-[10px] sm:text-xs border transition-all ' + (m.id === selectedModel ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10')}>
                    {m.name}
                  </button>
                ))}
              </div>
              <p className="text-white/20 text-[10px] mt-3">📎 Drag & drop or click attach</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={'max-w-[90%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 group relative ' +
                (msg.role === 'user' ? 'bg-orange-500/20 border border-orange-500/30 text-white' : 'bg-white/5 border border-white/10 text-white/90')}>

                {/* File attachments */}
                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.files.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/60">
                        {f.isImage ? '🖼️' : '📄'} {f.name} <span className="text-white/30">({fmtSize(f.size)})</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Thinking */}
                {msg.thinking && (
                  <details className="mb-2">
                    <summary className="text-[10px] sm:text-xs text-purple-400 cursor-pointer hover:text-purple-300">💭 View thinking</summary>
                    <div className="mt-2 text-[10px] sm:text-xs text-white/50 bg-purple-500/5 rounded-lg p-2 sm:p-3 border border-purple-500/20 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">{msg.thinking}</div>
                  </details>
                )}

                {/* Content -- Edit mode for user / MessageContent for assistant */}
                {editingId === msg.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-black/30 border border-orange-500/30 text-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditSubmit(msg.id)} className="px-3 py-1 text-xs rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors">Save & Resend</button>
                      <button onClick={handleEditCancel} className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  msg.role === 'assistant' ? (
                    <MessageContent content={msg.content} />
                  ) : (
                    <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                  )
                )}

                {/* Meta + action buttons */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-white/25">
                    <span>{msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.modelName && <span>• {msg.modelName}</span>}
                    {msg.cost != null && <span className="text-green-400/50">• ${msg.cost.toFixed(4)}</span>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.role === 'assistant' && <CopyButton text={msg.content} />}
                    {msg.role === 'user' && editingId !== msg.id && (
                      <button onClick={() => handleEdit(msg.id)} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading with Stop button */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-white/50">{currentModel.name}...</span>
                <button onClick={handleStop} className="ml-2 px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] sm:text-xs hover:bg-red-500/30 transition-colors flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
                  Stop
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center px-2">
              <div className="w-full max-w-md px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm">❌ {error}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* COST */}
      {cost !== null && (
        <div className="shrink-0 px-4 py-1 bg-green-500/5 border-t border-green-500/10">
          <p className="text-[10px] text-green-400/60 text-center">Cost: ${cost.toFixed(6)}</p>
        </div>
      )}

      {/* ATTACHED FILES */}
      {attachedFiles.length > 0 && (
        <div className="shrink-0 px-3 sm:px-4 py-2 border-t border-white/5 bg-gray-900/50">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-1.5">
            {attachedFiles.map((f, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                <span>{f.isImage ? '🖼️' : '📄'}</span>
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{f.name}</span>
                <span className="text-white/30 text-[10px]">({fmtSize(f.size)})</span>
                <button onClick={() => setAttachedFiles((p) => p.filter((_, j) => j !== i))} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-white/40 hover:text-red-400">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INPUT */}
      <div className="shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-sm safe-bottom">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex gap-2 items-end">
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}
              className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors" title="Attach">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept={ALLOWED_EXT.join(',')} onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} />
            <div className="flex-1">
              <textarea ref={inputRef} value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }}
                onKeyDown={handleKeyDown} disabled={isLoading}
                placeholder={'Chat dengan ' + currentModel.name + '...'}
                rows={1}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40 disabled:opacity-50 transition-all leading-relaxed"
                style={{ minHeight: '42px', maxHeight: '160px' }} />
            </div>
            <button onClick={() => handleSend(inputValue)} disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)}
              className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 disabled:shadow-none">
              {isLoading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-0.5">
            <span className="text-[9px] sm:text-[10px] text-white/15">{currentModel.name} • {currentModel.costLevel}</span>
            <span className="text-[9px] sm:text-[10px] text-white/15">Enter send • Shift+Enter newline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;