import { NextRequest, NextResponse } from 'next/server'
import { invokeClaude } from '@/lib/bedrock'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { messages, chatId } = await req.json()

    // Panggil Claude via Bedrock
    const response = await invokeClaude(messages)

    // Simpan ke Supabase jika ada chatId
    if (chatId) {
      await supabase.from('messages').insert([
        { chat_id: chatId, role: 'user', content: messages[messages.length - 1].content },
        { chat_id: chatId, role: 'assistant', content: response }
      ])
    }

    return NextResponse.json({ content: response })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to get response from Claude' },
      { status: 500 }
    )
  }
}
