'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase'; // Jika ada, kalau tidak hapus

// Client-side auth menggunakan @supabase/ssr
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Export singleton untuk convenience
export const supabaseClient = createClient();

// Auth helpers
export async function signUp(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  await supabaseClient.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}
