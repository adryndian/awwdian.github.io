import { supabaseClient } from '../auth/supabase';
import { ChatSession, Message } from '@/types';

export async function getUserChats(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabaseClient
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  
  return (data || []).map(m => ({
    ...m,
    timestamp: new Date(m.created_at),
    files: m.files || [],
  }));
}

export async function createChat(userId: string, title: string, model: string): Promise<string> {
  const { data, error } = await supabaseClient
    .from('chats')
    .insert({
      user_id: userId,
      title,
      default_model: model,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function saveMessage(message: Partial<Message>, chatId: string) {
  const { error } = await supabaseClient
    .from('messages')
    .insert({
      chat_id: chatId,
      role: message.role,
      content: message.content,
      model: message.model,
      input_tokens: message.tokens?.input,
      output_tokens: message.tokens?.output,
      cost_usd: message.cost,
      files: message.files || [],
    });

  if (error) throw error;
}

export async function updateChatTitle(chatId: string, title: string) {
  const { error } = await supabaseClient
    .from('chats')
    .update({ title })
    .eq('id', chatId);

  if (error) throw error;
}

export async function deleteChat(chatId: string) {
  const { error } = await supabaseClient
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) throw error;
}
