'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Search, MessageSquare, Trash2, LogOut } from 'lucide-react';
import { ChatSession } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  userId: string;
  chats: ChatSession[];
  currentChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
  onNewChat: () => void;
  isLoading?: boolean;
}

export function Sidebar({ 
  chats, 
  currentChatId, 
  onSelectChat, 
  onNewChat,
  isLoading 
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setDeletingId(chatId);
    try {
      const { error } = await supabase.from('chats').delete().eq('id', chatId);
      if (!error) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      <aside className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed lg:static inset-y-0 left-0 z-40 w-80 bg-gray-900 border-r border-white/10 
        flex flex-col transition-transform duration-300 ease-in-out
      `}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Chats</h2>
            <button
              onClick={onNewChat}
              className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              title="New Chat"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center p-4 text-gray-500 text-sm">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`
                  group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                  ${currentChatId === chat.id 
                    ? "bg-blue-600/20 border border-blue-500/30" 
                    : "hover:bg-white/5 border border-transparent"}
                `}
              >
                <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {chat.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(chat.updatedAt, { addSuffix: true })}
                  </p>
                </div>
                
                <button
                  onClick={(e) => handleDelete(e, chat.id)}
                  disabled={deletingId === chat.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
                >
                  {deletingId === chat.id ? (
                    <div className="w-3 h-3 border border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 text-red-400" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
