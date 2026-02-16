'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, FolderOpen, Loader2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ExtractedFile } from '@/types';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (files: ExtractedFile[]) => void;
  onClose: () => void;
}

export function FileUpload({ onUpload, onClose }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Upload failed');
        return;
      }

      const data = await res.json();
      setExtractedFiles(data.files);
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const confirmUpload = () => {
    onUpload(extractedFiles);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <GlassCard 
        className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Upload Files</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {!extractedFiles.length ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                isDragging 
                  ? "border-[#007AFF] bg-[#007AFF]/10" 
                  : "border-white/20 hover:border-white/40 hover:bg-white/5"
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
                <Loader2 className="w-12 h-12 text-white/40 animate-spin mx-auto mb-4" />
              ) : (
                <Upload className={cn(
                  "w-12 h-12 mx-auto mb-4 transition-colors",
                  isDragging ? "text-[#007AFF]" : "text-white/40"
                )} />
              )}
              
              <p className="text-white font-medium mb-2">
                {isUploading ? 'Processing...' : 'Drop ZIP or text file here'}
              </p>
              <p className="text-sm text-white/50">
                Supports: ZIP, TXT, MD, JSON, CSV, Code files
              </p>
              <p className="text-xs text-white/40 mt-2">
                Max 10 files, 1MB per file
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
                <FolderOpen className="w-4 h-4" />
                <span>{extractedFiles.length} files extracted</span>
              </div>
              
              {extractedFiles.map((file, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <FileText className="w-5 h-5 text-[#007AFF]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-white/50">{file.content.length.toLocaleString()} chars</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {extractedFiles.length > 0 && (
          <div className="p-4 border-t border-white/10 flex gap-3">
            <button
              onClick={() => setExtractedFiles([])}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={confirmUpload}
              className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-white font-medium hover:bg-[#0051D5] transition-colors"
            >
              Attach Files
            </button>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
  