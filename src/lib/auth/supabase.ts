import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Client-side auth
export const supabaseClient = createClientComponentClient();

// Server-side auth (for API routes)
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
