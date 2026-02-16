'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Button } from './ui/Button';
import { ChatSession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SidebarProps {
  chats: ChatSession[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  user?: { email: string; name?: string };
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  user,
  onLogout,
  isOpen,
  onToggle,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setDeletingId(chatId);
    setTimeout(() => {
      onDeleteChat(chatId);
      setDeletingId(null);
    }, 200);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          x: isOpen ? 0 : '-100%',
          width: isOpen ? 320 : 0 
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50',
          'flex flex-col',
          'lg:translate-x-0 lg:w-80'
        )}
      >
        <GlassCard className="h-full flex flex-col m-2 lg:m-0 rounded-2xl lg:rounded-none">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-white">Claude Chat</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="lg:hidden"
                leftIcon={<ChevronLeft className="w-5 h-5" />}
              />
            </div>
            
            <Button
              variant="primary"
              onClick={onNewChat}
              className="w-full"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Chat
            </Button>
          </div>

          {/* Search */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <AnimatePresence mode="popLayout">
              {filteredChats.map((chat) => (
                <motion.button
                  key={chat.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ 
                    opacity: deletingId === chat.id ? 0 : 1,
                    y: 0,
                    scale: deletingId === chat.id ? 0.9 : 1
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
                    currentChatId === chat.id
                      ? 'bg-[#007AFF]/30 border border-[#007AFF]/50'
                      : 'hover:bg-white/10 border border-transparent'
                  )}
                >
                  <MessageSquare className="w-5 h-5 text-white/60 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {chat.title || 'New Chat'}
                    </div>
                    <div className="text-xs text-white/40">
                      {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 p-1.5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" />
                  </button>
                </motion.button>
              ))}
            </AnimatePresence>

            {filteredChats.length === 0 && (
              <div className="text-center py-8 text-white/40">
                {searchQuery ? 'No chats found' : 'No chats yet'}
              </div>
            )}
          </div>

          {/* User Section */}
          <div className="p-4 border-t border-white/10 space-y-2">
            {user && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-medium">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {user.name || user.email}
                  </div>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="w-full"
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Logout
            </Button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Toggle Button (Mobile) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onToggle}
          className="fixed top-4 left-4 z-40 lg:hidden p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      )}
    </>
  );
}
