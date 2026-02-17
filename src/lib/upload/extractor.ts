import AdmZip from 'adm-zip';
import type { ExtractedFile } from '@/types';

/**
 * Daftar ekstensi file yang diizinkan untuk diekstrak
 * Hanya file teks yang bisa diproses oleh LLM
 */
const ALLOWED_EXTENSIONS = [
  // Dokumen
  'txt', 'md', 'json', 'csv', 'xml', 'yaml', 'yml',
  // Programming
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 
  'go', 'rs', 'rb', 'php', 'swift', 'kt', 'cs',
  // Web
  'html', 'css', 'scss', 'sass', 'less',
  // Config & Data
  'sql', 'env', 'config', 'ini', 'toml', 'log'
];

/**
 * Limitasi untuk mencegah abuse dan memory leak
 */
const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
const MAX_FILES = 10; // Maksimal 10 file per ZIP
const MAX_CONTENT_LENGTH = 5000000; // 50k karakter per file

/**
 * Fungsi utama untuk ekstrak ZIP file
 * @param buffer - Buffer dari file ZIP yang diupload
 * @returns Array of ExtractedFile yang sudah difilter dan divalidasi
 */
export async function extractZip(buffer: Buffer): Promise<ExtractedFile[]> {
  try {
    // Inisialisasi adm-zip dengan buffer
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const extracted: ExtractedFile[] = [];

    console.log(`[ZIP Extractor] Found ${entries.length} entries in ZIP`);

    // Loop melalui setiap entry dalam ZIP
    for (const entry of entries) {
      // Skip jika sudah mencapai limit file
      if (extracted.length >= MAX_FILES) {
        console.warn(`[ZIP Extractor] Reached max files limit (${MAX_FILES})`);
        break;
      }

      // Skip directory dan hidden files
      if (entry.isDirectory) {
        console.log(`[ZIP Extractor] Skipping directory: ${entry.entryName}`);
        continue;
      }

      // Skip macOS metadata files
      if (entry.entryName.startsWith('__MACOSX') || entry.entryName.startsWith('.')) {
        console.log(`[ZIP Extractor] Skipping hidden file: ${entry.entryName}`);
        continue;
      }

      // Cek ekstensi file
      const fileName = entry.name;
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        console.log(`[ZIP Extractor] Skipping unsupported extension: ${ext}`);
        continue;
      }

      // Cek ukuran file (compressed size)
      if (entry.getData().length > MAX_FILE_SIZE) {
        console.warn(`[ZIP Extractor] File too large: ${fileName} (${entry.getData().length} bytes)`);
        continue;
      }

      // Ekstrak content sebagai UTF-8 string
      try {
        const content = entry.getData().toString('utf-8');
        
        // Skip file kosong
        if (!content || content.trim().length === 0) {
          console.log(`[ZIP Extractor] Skipping empty file: ${fileName}`);
          continue;
        }

        // Truncate jika terlalu panjang
        const truncatedContent = content.length > MAX_CONTENT_LENGTH 
          ? content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated...]'
          : content;

        extracted.push({
          name: fileName,
          content: truncatedContent,
          extension: ext,
        });

        console.log(`[ZIP Extractor] Extracted: ${fileName} (${truncatedContent.length} chars)`);

      } catch (decodeError) {
        console.error(`[ZIP Extractor] Failed to decode ${fileName}:`, decodeError);
        continue; // Skip file yang tidak bisa didecode
      }
    }

    console.log(`[ZIP Extractor] Total extracted: ${extracted.length} files`);
    return extracted;

  } catch (error) {
    console.error('[ZIP Extractor] Failed to extract ZIP:', error);
    throw new Error('Failed to extract ZIP file. Make sure it is a valid ZIP archive.');
  }
}

/**
 * Validasi apakah file adalah ZIP yang valid
 * @param file - File object dari input
 */
export function validateZipFile(file: File): boolean {
  // Cek MIME type atau ekstensi
  const isZipMime = file.type === 'application/zip' || 
                    file.type === 'application/x-zip-compressed';
  const isZipExt = file.name.toLowerCase().endsWith('.zip');
  
  return isZipMime || isZipExt;
}

/**
 * Format bytes ke human readable string
 * @param bytes - Ukuran dalam bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
