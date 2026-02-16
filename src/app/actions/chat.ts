'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function getUserChats(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error('Failed to fetch chats');
  return data || [];
}

export async function getChatMessages(chatId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Failed to fetch messages');
  return data || [];
}

export async function createChat(userId: string, title: string, model: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('chats')
    .insert({ user_id: userId, title, default_model: model })
    .select('id')
    .single();

  if (error || !data) throw new Error('Failed to create chat');
  
  revalidatePath('/chat');
  return data.id;
}

export async function saveMessage(message: any, chatId: string) {
  const supabase = createClient();
  
  const { error } = await supabase.from('messages').insert({
    chat_id: chatId,
    role: message.role,
    content: message.content,
    model: message.model,
    input_tokens: message.tokens?.input,
    output_tokens: message.tokens?.output,
    cost_usd: message.cost,
    files: message.files || [],
  });

  if (error) throw new Error('Failed to save message');
}
