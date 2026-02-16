'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

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
  acceptImages?: boolean;
  acceptDocuments?: boolean;
}

export function FileUpload({
  files,
  onFilesChange,
  maxFiles = 5,
  acceptImages = true,
  acceptDocuments = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || files.length >= maxFiles) return;

    setIsUploading(true);

    for (let i = 0; i < Math.min(selectedFiles.length, maxFiles - files.length); i++) {
      const file = selectedFiles[i];
      
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isDocument = file.type === 'application/pdf' || 
                        file.type === 'text/plain' ||
                        file.type === 'application/json' ||
                        file.type.includes('csv');

      if (!isImage && !isDocument) continue;
      if (isImage && !acceptImages) continue;
      if (!isImage && !acceptDocuments) continue;

      // Upload to API
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (res.ok) {
          const uploadedFile = await res.json();
          onFilesChange([...files, uploadedFile]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setIsUploading(false);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      {/* File List */}
      <AnimatePresence>
        {files.map((file) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="relative group"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="w-6 h-6 text-white/60" />
                  ) : (
                    <FileText className="w-6 h-6 text-white/60" />
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate text-sm">
                  {file.name}
                </div>
                <div className="text-xs text-white/50">
                  {formatSize(file.size)}
                </div>
              </div>

              <button
                onClick={() => removeFile(file.id)}
                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4 text-white/60 hover:text-red-400" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Upload Button */}
      {files.length < maxFiles && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={`
            w-full flex items-center justify-center gap-2 p-4 rounded-xl
            bg-white/5 backdrop-blur-md border border-white/10
            hover:bg-white/10 hover:border-white/20
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isDragging ? 'bg-[#007AFF]/20 border-[#007AFF]/50' : ''}
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => handleFileSelect(e.target.files)}
            accept={`
              ${acceptImages ? 'image/*,' : ''}
              ${acceptDocuments ? '.pdf,.txt,.json,.csv' : ''}
            `}
            multiple
            className="hidden"
          />
          
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-white/60" />
          )}
          
          <span className="text-white/60 text-sm">
            {isUploading ? 'Uploading...' : 'Drop files or click to upload'}
          </span>
        </motion.button>
      )}
    </div>
  );
}
