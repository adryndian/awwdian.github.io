'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase'; // Opsional: buat tipe jika perlu

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
