'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DEFAULT_MODEL, isValidModelId, MODELS, getModelConfig } from '@/lib/models/config';
import type { Message, AiStatus, FileAttachment } from '@/types';

interface ChatContainerProps {
  userId?: string;
  initialModel?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  // Code
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.c', '.cpp', '.h',
  '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.dart',
  '.html', '.css', '.scss', '.less', '.sql', '.sh', '.bash',
  '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env',
  '.md', '.txt', '.csv', '.log',
  // Archives
  '.zip',
  // Config
  '.gitignore', '.dockerignore', '.editorconfig',
  'Dockerfile', 'Makefile',
];

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.substring(idx).toLowerCase() : '';
}

function isImageFile(name: string): boolean {
  const ext = getFileExtension(name);
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processZipFile(file: File): Promise<string> {
  const base64 = await readFileAsBase64(file);
  return '[ZIP Archive: ' + file.name + ' (' + formatFileSize(file.size) + ')]\nBase64 content available for analysis. File contains compressed data.';
}

async function processFile(file: File): Promise<FileAttachment> {
  const ext = getFileExtension(file.name);
  const isImg = isImageFile(file.name);

  if (isImg) {
    const base64 = await readFileAsBase64(file);
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      base64,
      isImage: true,
    };
  }

  if (ext === '.zip') {
    const content = await processZipFile(file);
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      content,
      isImage: false,
    };
  }

  // Text/code files
  const content = await readFileAsText(file);
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    content,
    isImage: false,
  };
}

export function ChatContainer({ initialModel }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(
    isValidModelId(initialModel || '') ? initialModel! : DEFAULT_MODEL
  );
  const [cost, setCost] = useState<number | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File handling
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const processed: FileAttachment[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        setError('File ' + file.name + ' terlalu besar (max 10MB)');
        continue;
      }

      const ext = getFileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.includes(ext) && !file.name.includes('.')) {
        setError('File type ' + ext + ' tidak didukung');
        continue;
      }

      try {
        const attachment = await processFile(file);
        processed.push(attachment);
      } catch {
        setError('Gagal membaca file: ' + file.name);
      }
    }

    if (processed.length > 0) {
      setAttachedFiles((prev) => [...prev, ...processed]);
      setError(null);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Build message with file context
  const buildMessageWithFiles = useCallback(
    (text: string, files: FileAttachment[]): string => {
      if (files.length === 0) return text;

      let fileContext = '';

      for (const file of files) {
        if (file.isImage) {
          fileContext += '\n\n[Attached Image: ' + file.name + ' (' + formatFileSize(file.size) + ')]';
        } else if (file.content) {
          fileContext += '\n\n--- File: ' + file.name + ' (' + formatFileSize(file.size) + ') ---\n';
          // Truncate very large files
          if (file.content.length > 50000) {
            fileContext += file.content.substring(0, 50000) + '\n... (truncated, ' + file.content.length + ' total chars)';
          } else {
            fileContext += file.content;
          }
          fileContext += '\n--- End of ' + file.name + ' ---';
        }
      }

      return text + fileContext;
    },
    []
  );

  // Send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if ((!content.trim() && attachedFiles.length === 0) || isLoading) return;
      setIsLoading(true);
      setError(null);
      setAiStatus('loading');

      const messageText = content.trim() || 'Please analyze the attached file(s).';
      const fullMessage = buildMessageWithFiles(messageText, attachedFiles);

      setInputValue('');
      if (inputRef.current) {
        inputRef.current.style.height = '48px';
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: new Date(),
        files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);
      setAttachedFiles([]);

      try {
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Build request with optional image support
        const hasImages = userMessage.files?.some((f) => f.isImage);
        const mc = getModelConfig(selectedModel);

        let apiMessage: string;
        let apiBody: Record<string, unknown>;

        if (hasImages && mc.supportsVision && mc.provider === 'Anthropic') {
          // For Anthropic vision, we send images as part of the content
          apiMessage = fullMessage;
          apiBody = {
            message: apiMessage,
            modelId: selectedModel,
            history,
            images: userMessage.files
              ?.filter((f) => f.isImage && f.base64)
              .map((f) => ({
                type: f.type || 'image/png',
                data: f.base64,
              })),
          };
        } else {
          apiMessage = fullMessage;
          apiBody = {
            message: apiMessage,
            modelId: selectedModel,
            history,
          };
        }

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiBody),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server error');
        if (!data.message) throw new Error('Empty response.');

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date(),
            model: data.model || selectedModel,
            modelName: data.modelName,
            thinking: data.thinking,
            cost: data.cost,
          },
        ]);
        setCost(data.cost ?? null);
        setAiStatus('idle');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setAiStatus('error');
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [messages, selectedModel, isLoading, attachedFiles, buildMessageWithFiles]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(inputValue);
      }
    },
    [inputValue, handleSendMessage]
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setCost(null);
    setAiStatus('idle');
    setAttachedFiles([]);
  }, []);

  const currentModel = getModelConfig(selectedModel);
  const allModels = Object.values(MODELS);

  return (
    <div
      className="flex flex-col h-[100dvh] bg-gray-950 text-white overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-orange-500/10 border-2 border-dashed border-orange-500/50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <div className="text-4xl mb-2">📎</div>
            <p className="text-orange-400 font-medium">Drop files here</p>
            <p className="text-orange-400/60 text-sm">Images, code files, or ZIP</p>
          </div>
        </div>
      )}

      {/* ========== HEADER ========== */}
      <header className="shrink-0 border-b border-white/10 bg-gray-900/80 backdrop-blur-sm safe-top">
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xs sm:text-sm font-bold">
              B
            </div>
            <span className="font-semibold text-sm sm:text-base truncate">BeckRock AI</span>
          </div>

          {/* Model selector + Clear */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <select
              value={selectedModel}
              onChange={(e) => {
                if (isValidModelId(e.target.value)) setSelectedModel(e.target.value);
              }}
              disabled={isLoading}
              className="max-w-[140px] sm:max-w-none px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-sm rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 truncate"
            >
              {allModels.map((model) => (
                <option key={model.id} value={model.id} className="bg-gray-900">
                  {model.name}
                </option>
              ))}
            </select>

            <button
              onClick={handleClearChat}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Clear chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ========== MESSAGES ========== */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3 sm:space-y-4 px-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg shadow-orange-500/20">
                AI
              </div>
              <h2 className="text-white/80 text-base sm:text-lg font-medium">
                BeckRock AI
              </h2>
              <p className="text-white/40 text-xs sm:text-sm max-w-sm">
                {currentModel.description}
              </p>
              {/* Model chips */}
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-2">
                {allModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={
                      'rounded-full px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs border transition-all ' +
                      (m.id === selectedModel
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60')
                    }
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              <p className="text-white/20 text-[10px] sm:text-xs mt-4">
                📎 Drag & drop files or click 📎 to attach
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={
                  'max-w-[90%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ' +
                  (msg.role === 'user'
                    ? 'bg-orange-500/20 border border-orange-500/30 text-white'
                    : 'bg-white/5 border border-white/10 text-white/90')
                }
              >
                {/* Attached files indicator */}
                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.files.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-white/60"
                      >
                        {f.isImage ? '🖼️' : '📄'} {f.name}
                        <span className="text-white/30">({formatFileSize(f.size)})</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Thinking */}
                {msg.thinking && (
                  <details className="mb-2">
                    <summary className="text-[10px] sm:text-xs text-purple-400 cursor-pointer hover:text-purple-300">
                      💭 View thinking
                    </summary>
                    <div className="mt-2 text-[10px] sm:text-xs text-white/50 bg-purple-500/5 rounded-lg p-2 sm:p-3 border border-purple-500/20 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {msg.thinking}
                    </div>
                  </details>
                )}

                {/* Content */}
                <div className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </div>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-[9px] sm:text-[10px] text-white/25">
                  <span>{msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.modelName && <span>• {msg.modelName}</span>}
                  {msg.cost != null && <span className="text-green-400/50">• ${msg.cost.toFixed(4)}</span>}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 text-xs sm:text-sm text-white/50">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">{currentModel.name}...</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center px-2">
              <div className="w-full max-w-md px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm">
                <span className="font-medium">❌ </span>{error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ========== COST ========== */}
      {cost !== null && (
        <div className="shrink-0 px-4 py-1 bg-green-500/5 border-t border-green-500/10">
          <p className="text-[10px] text-green-400/60 text-center">
            Cost: ${cost.toFixed(6)}
          </p>
        </div>
      )}

      {/* ========== ATTACHED FILES PREVIEW ========== */}
      {attachedFiles.length > 0 && (
        <div className="shrink-0 px-3 sm:px-4 py-2 border-t border-white/5 bg-gray-900/50">
          <div className="max-w-3xl mx-auto flex flex-wrap gap-1.5">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70"
              >
                <span>{file.isImage ? '🖼️' : '📄'}</span>
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                <span className="text-white/30 text-[10px]">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => removeFile(idx)}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== INPUT AREA ========== */}
      <div className="shrink-0 border-t border-white/10 bg-gray-900/80 backdrop-blur-sm safe-bottom">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex gap-2 items-end">
            {/* File attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="Attach files"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder={'Chat dengan ' + currentModel.name + '...'}
                rows={1}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/30 disabled:opacity-50 transition-all leading-relaxed"
                style={{ minHeight: '42px', maxHeight: '160px' }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)}
              className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20 disabled:shadow-none"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Hints */}
          <div className="flex items-center justify-between mt-1.5 px-0.5">
            <span className="text-[9px] sm:text-[10px] text-white/15">
              {currentModel.name} • {currentModel.costLevel}
            </span>
            <span className="text-[9px] sm:text-[10px] text-white/15">
              Enter send • Shift+Enter newline • 📎 files
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;