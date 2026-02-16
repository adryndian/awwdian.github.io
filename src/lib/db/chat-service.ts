import { createClient } from '@/lib/supabase/server';
import { ChatSession, Message } from '@/types';
import { cache } from 'react';

// Helper untuk mapping dengan tipe aman
function mapChat(raw: any): ChatSession {
  return {
    id: raw.id as string,
    title: raw.title as string,
    messages: [],
    defaultModel: (raw.default_model as ChatSession['defaultModel']) || 'claude-sonnet-4-5',
    createdAt: new Date(raw.created_at as string),
    updatedAt: new Date(raw.updated_at as string),
  };
}

function mapMessage(raw: any): Message {
  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    timestamp: new Date(raw.created_at),
    model: raw.model,
    tokens: raw.input_tokens ? { 
      input: raw.input_tokens, 
      output: raw.output_tokens 
    } : undefined,
    cost: raw.cost_usd,
    files: raw.files || [],
  };
}

export const getUserChats = cache(async (userId: string): Promise<ChatSession[]> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    throw new Error('Failed to fetch chats');
  }

  return (data || []).map(mapChat);
});

export const getChatMessages = cache(async (chatId: string): Promise<Message[]> => {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    throw new Error('Failed to fetch messages');
  }

  return (data || []).map(mapMessage);
});

export async function createChat(
  userId: string, 
  title: string, 
  model: string
): Promise<string> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('chats')
    .insert({ 
      user_id: userId, 
      title, 
      default_model: model 
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error creating chat:', error);
    throw new Error('Failed to create chat');
  }
  
  return data.id;
}

export async function saveMessage(
  message: Partial<Message>, 
  chatId: string
): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
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

  if (error) {
    console.error('Error saving message:', error);
    throw new Error('Failed to save message');
  }
}

export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('chats')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', chatId);

  if (error) {
    console.error('Error updating title:', error);
    throw new Error('Failed to update title');
  }
}

export async function deleteChat(chatId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) {
    console.error('Error deleting chat:', error);
    throw new Error('Failed to delete chat');
  }
}
