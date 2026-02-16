'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipe data untuk database
export type Chat = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type Message = {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
