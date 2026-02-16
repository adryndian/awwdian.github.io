import { supabaseClient } from '../auth/supabase';
import { ChatSession, Message } from '@/types';

function mapChat(raw: Record<string, unknown>): ChatSession {
  return {
    id: raw.id as string,
    title: raw.title as string,
    messages: [],
    defaultModel: (raw.default_model as ChatSession['defaultModel']) || 'claude-sonnet-4-5',
    createdAt: new Date(raw.created_at as string),
    updatedAt: new Date(raw.updated_at as string),
  };
}

export async function getUserChats(userId: string): Promise<ChatSession[]> {
  const { data, error } = await supabaseClient
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapChat);
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.created_at),
    model: m.model,
    tokens: m.input_tokens ? { input: m.input_tokens, output: m.output_tokens } : undefined,
    cost: m.cost_usd,
    files: m.files || [],
  }));
}

export async function createChat(userId: string, title: string, model: string): Promise<string> {
  const { data, error } = await supabaseClient
    .from('chats')
    .insert({ user_id: userId, title, default_model: model })
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
