'use client';

import { useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (files?: any[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function InputArea({ value, onChange, onSend, isLoading, disabled }: InputAreaProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle file upload logic di sini
    console.log(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    disabled: isLoading || disabled,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading || disabled) return;
    onSend();
  };

  return (
    <div {...getRootProps()} className="relative">
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-xl flex items-center justify-center z-10">
          <p className="text-blue-400 font-medium">Drop files here</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-gray-900 border border-white/10 rounded-xl p-2">
        <button
          type="button"
          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          disabled={isLoading || disabled}
        >
          <Paperclip className="w-5 h-5" />
          <input {...getInputProps()} />
        </button>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ketik pesan..."
          disabled={isLoading || disabled}
          className="flex-1 bg-transparent text-white placeholder-white/40 resize-none max-h-32 py-2 px-1 focus:outline-none"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />

        <button
          type="submit"
          disabled={!value.trim() || isLoading || disabled}
          className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>
    </div>
  );
}
