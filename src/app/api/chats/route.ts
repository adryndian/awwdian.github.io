import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(chats)
}

export async function POST(req: NextRequest) {
  const { title } = await req.json()
  const id = uuidv4()
  
  const { data, error } = await supabase
    .from('chats')
    .insert([{ id, title: title || 'New Chat', user_id: 'anonymous' }])
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data[0])
}
