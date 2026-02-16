'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  preview?: string;
}

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

export function FileUpload({ files, onFilesChange, maxFiles = 5 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (files.length >= maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Upload failed');
        return;
      }
      const data = await res.json();
      const newFile: UploadedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: data.content || '',
      };
      onFilesChange([...files, newFile]);
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all',
          isDragging ? 'border-[#007AFF] bg-[#007AFF]/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.txt,.md,.json,.csv,.js,.ts,.py"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-white/40 animate-spin mx-auto mb-2" />
        ) : (
          <Upload className={cn('w-8 h-8 mx-auto mb-2', isDragging ? 'text-[#007AFF]' : 'text-white/40')} />
        )}
        <p className="text-sm text-white/60">
          {isUploading ? 'Uploading...' : `Drop file or click (${files.length}/${maxFiles})`}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              <FileText className="w-4 h-4 text-[#007AFF] shrink-0" />
              <span className="flex-1 text-sm text-white truncate">{file.name}</span>
              <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-3 h-3 text-white/40 hover:text-white" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
