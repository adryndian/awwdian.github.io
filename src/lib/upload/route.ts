import { NextRequest } from 'next/server';
import { extractZip, validateZipFile } from '@/lib/upload/extractor';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Handle ZIP
    if (validateZipFile(file)) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const extracted = await extractZip(buffer);

      if (extracted.length === 0) {
        return Response.json({ 
          error: 'No valid text files found in ZIP. Allowed: txt, md, json, csv, code files' 
        }, { status: 400 });
      }

      return Response.json({
        type: 'zip',
        name: file.name,
        files: extracted,
        count: extracted.length,
      });
    }

    // Handle single text file
    const text = await file.text();
    const ext = file.name.split('.').pop() || 'txt';
    
    return Response.json({
      type: 'single',
      name: file.name,
      files: [{
        name: file.name,
        content: text.substring(0, 50000),
        extension: ext,
      }],
      count: 1,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
