
export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { extractZip, validateZipFile, formatFileSize } from '@/lib/upload/extractor';
import type { ExtractedFile } from '@/types';

/**
 * Konstanta limitasi
 */
const MAX_ZIP_SIZE = 10 * 1024 * 1024; // 10MB total ZIP size (Vercel limit)
const ALLOWED_SINGLE_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'text/x-csv',
];

/**
 * POST Handler untuk file upload
 * Support: ZIP (multiple files) atau Single text file
 */
export async function POST(req: NextRequest) {
  try {
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    // Validasi existence
    if (!file) {
      console.error('[Upload API] No file provided');
      return NextResponse.json(
        { error: 'No file provided', code: 'NO_FILE' },
        { status: 400 }
      );
    }

    // Validasi ukuran
    if (file.size > MAX_ZIP_SIZE) {
      console.error(`[Upload API] File too large: ${file.size} bytes`);
      return NextResponse.json(
        { 
          error: `File too large. Maximum size is ${formatFileSize(MAX_ZIP_SIZE)}`,
          code: 'FILE_TOO_LARGE',
          maxSize: MAX_ZIP_SIZE
        },
        { status: 413 }
      );
    }

    console.log(`[Upload API] Processing upload: ${file.name} (${formatFileSize(file.size)})`);

    // Handle ZIP file
    if (validateZipFile(file)) {
      return await handleZipUpload(file);
    }

    // Handle single text file
    if (ALLOWED_SINGLE_TYPES.includes(file.type) || file.name.match(/\.(txt|md|json|csv)$/i)) {
      return await handleSingleFileUpload(file);
    }

    // File type tidak didukung
    console.error(`[Upload API] Unsupported file type: ${file.type}`);
    return NextResponse.json(
      { 
        error: 'Unsupported file type. Allowed: ZIP, TXT, MD, JSON, CSV',
        code: 'UNSUPPORTED_TYPE',
        receivedType: file.type
      },
      { status: 415 }
    );

  } catch (error) {
    console.error('[Upload API] Unexpected error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('memory') || error.message.includes('buffer')) {
        return NextResponse.json(
          { error: 'File too large to process', code: 'MEMORY_ERROR' },
          { status: 413 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Handler khusus untuk ZIP files
 */
async function handleZipUpload(file: File) {
  try {
    // Convert File ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Upload API] Extracting ZIP: ${file.name}`);

    // Ekstrak menggunakan utility
    const extractedFiles = await extractZip(buffer);

    // Validasi hasil ekstrak
    if (extractedFiles.length === 0) {
      console.warn('[Upload API] No valid files found in ZIP');
      return NextResponse.json(
        { 
          error: 'No valid text files found in ZIP. Allowed files: code files, documents (txt, md, json, csv, etc.)',
          code: 'NO_VALID_FILES',
          allowedExtensions: ['txt', 'md', 'json', 'csv', 'js', 'ts', 'py', 'java', 'cpp', 'html', 'css']
        },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      type: 'zip',
      fileName: file.name,
      fileSize: file.size,
      extractedCount: extractedFiles.length,
      files: extractedFiles.map(f => ({
        name: f.name,
        extension: f.extension,
        contentLength: f.content.length,
        preview: f.content.substring(0, 200) + (f.content.length > 200 ? '...' : '')
      })),
      totalContentLength: extractedFiles.reduce((acc, f) => acc + f.content.length, 0)
    });

  } catch (error) {
    console.error('[Upload API] ZIP extraction failed:', error);
    
    if (error instanceof Error && error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: 'Invalid or corrupted ZIP file', code: 'INVALID_ZIP' },
        { status: 400 }
      );
    }

    throw error; // Re-throw untuk dihandle oleh catch utama
  }
}

/**
 * Handler untuk single text file
 */
async function handleSingleFileUpload(file: File) {
  try {
    // Baca content
    const text = await file.text();
    
    // Validasi content tidak kosong
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'File is empty', code: 'EMPTY_FILE' },
        { status: 400 }
      );
    }

    // Deteksi ekstensi
    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
    
    // Buat ExtractedFile structure
    const extractedFile: ExtractedFile = {
      name: file.name,
      content: text.length > 5000000 ? text.substring(0, 5000000) + '\n\n[Truncated...]' : text,
      extension: ext
    };

    console.log(`[Upload API] Processed single file: ${file.name} (${text.length} chars)`);

    return NextResponse.json({
      success: true,
      type: 'single',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      files: [extractedFile],
      extractedCount: 1,
      totalContentLength: text.length
    });

  } catch (error) {
    console.error('[Upload API] Failed to read text file:', error);
    return NextResponse.json(
      { error: 'Failed to read file content', code: 'READ_ERROR' },
      { status: 400 }
    );
  }
}

/**
 * OPTIONS handler untuk CORS (jika diperlukan)
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
