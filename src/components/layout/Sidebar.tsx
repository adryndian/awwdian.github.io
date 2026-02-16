'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, MessageSquare, Trash2, LogOut, 
  ChevronLeft, Search, Clock 
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { ChatSession } from '@/types';
import { getUserChats, deleteChat } from '@/lib/db/chat-service';
import { signOut } from '@/lib/auth/supabase';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userId: string;
  currentChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
  onNewChat: () => void;
  onChatDeleted: () => void;
}

export function Sidebar({ 
  userId, 
  currentChatId, 
  onSelectChat, 
  onNewChat,
  onChatDeleted 
}: SidebarProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, [userId]);

  const loadChats = async () => {
    try {
      const data = await getUserChats(userId);
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this chat?')) return;
    
    try {
      await deleteChat(chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));
      onChatDeleted();
    } catch (error) {
      alert('Failed to delete chat');
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          x: isOpen ? 0 : '-100%',
          width: isOpen ? 300 : 0 
        }}
        className="fixed lg:relative inset-y-0 left-0 z-50 h-full"
      >
        <div className="h-full p-3">
          <GlassCard className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <h1 className="text-lg font-bold text-white">Chats</h1>
              <button 
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
              <button
                onClick={onNewChat}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#007AFF] text-white font-medium hover:bg-[#0051D5] transition-colors shadow-lg shadow-[#007AFF]/20"
              >
                <Plus className="w-5 h-5" />
                New Chat
              </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#007AFF]/50"
                />
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-[#007AFF] rounded-full animate-spin" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm">
                  {searchQuery ? 'No chats found' : 'No chats yet'}
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <motion.button
                    key={chat.id}
                    layout
                    onClick={() => onSelectChat(chat)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all group",
                      currentChatId === chat.id
                        ? "bg-[#007AFF]/20 border border-[#007AFF]/30"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <MessageSquare className={cn(
                      "w-5 h-5 shrink-0 mt-0.5",
                      currentChatId === chat.id ? "text-[#007AFF]" : "text-white/40"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">
                        {chat.title}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" />
                    </button>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </GlassCard>
        </div>
      </motion.div>

      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 lg:hidden p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
