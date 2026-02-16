'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase'; // Buat tipe DB jika perlu

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Hook untuk convenience
export const supabaseClient = createClient();
