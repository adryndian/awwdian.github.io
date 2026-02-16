'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip } from 'lucide-react';
import { FileUpload } from '../upload/FileUpload'; 

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  preview?: string;
}

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (files?: UploadedFile[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function InputArea({
  value,
  onChange,
  onSend,
  isLoading,
  placeholder = 'Message...',
}: InputAreaProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const handleSend = () => {
    if ((!value.trim() && files.length === 0) || isLoading) return;
    onSend(files.length > 0 ? files : undefined);
    setFiles([]);
    setShowUpload(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3">
      {/* File Upload Panel */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
        >
          <FileUpload
            files={files}
            onFilesChange={setFiles}
            maxFiles={5}
          />
        </motion.div>
      )}

      {/* Input Container */}
      <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        {/* Attach Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowUpload(!showUpload)}
          className={`
            p-3 rounded-xl transition-colors
            ${showUpload ? 'bg-[#007AFF]/30 text-[#007AFF]' : 'hover:bg-white/10 text-white/60'}
          `}
        >
          <Paperclip className="w-5 h-5" />
        </motion.button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          className="
            flex-1 bg-transparent text-white placeholder-white/40
            resize-none outline-none py-3 px-2
            min-h-[48px] max-h-[200px]
            text-base
          "
        />

        {/* Send Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!value.trim() && files.length === 0}
          className={`
            p-3 rounded-xl bg-[#007AFF] text-white
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:bg-[#0051D5] transition-colors
            shadow-lg shadow-[#007AFF]/30
          `}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </motion.button>
      </div>

      {/* File count indicator */}
      {files.length > 0 && !showUpload && (
        <div className="text-xs text-white/50 px-2">
          {files.length} file{files.length > 1 ? 's' : ''} attached
        </div>
      )}
    </div>
  );
}
