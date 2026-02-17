'use client';

import { useState } from 'react';
import { Plus, Search, MessageSquare, Trash2, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { ChatSession } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  userId: string;
  chats: ChatSession[];
  currentChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => Promise<void>;
  isLoading?: boolean;
}

export function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isLoading,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSelectChat = (chat: ChatSession) => {
    onSelectChat(chat);
    setIsMobileOpen(false);
  };

  const handleNewChat = () => {
    onNewChat();
    setIsMobileOpen(false);
  };

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const now = new Date();
  const todayChats = filteredChats.filter(
    (c) => now.getTime() - c.updatedAt.getTime() < 86400000
  );
  const olderChats = filteredChats.filter(
    (c) => now.getTime() - c.updatedAt.getTime() >= 86400000
  );

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    
    if (!confirm('Apakah Anda yakin ingin menghapus percakapan ini?')) {
      return;
    }
    
    setDeletingId(chatId);
    
    try {
      await onDeleteChat(chatId);
    } catch (error) {
      console.error('Delete error in Sidebar:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white drop-shadow" />
            </div>
            <span className="font-bold text-white text-base drop-shadow-sm">BeckRock AI</span>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/80 transition-smooth"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Chat Baru</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 sm:px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3 space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8 animate-fadeInUp">
            <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3 drop-shadow" />
            <p className="text-sm text-white/50 drop-shadow-sm">
              {searchQuery ? 'Tidak ditemukan' : 'Belum ada percakapan'}
            </p>
          </div>
        ) : (
          <>
            {todayChats.length > 0 && (
              <div className="animate-fadeInUp">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider px-3 py-2 drop-shadow-sm">
                  Hari ini
                </p>
                {todayChats.map((chat, idx) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChatId === chat.id}
                    isDeleting={deletingId === chat.id}
                    onSelect={handleSelectChat}
                    onDelete={handleDelete}
                    delay={idx * 0.05}
                  />
                ))}
              </div>
            )}
            {olderChats.length > 0 && (
              <div className="mt-2 animate-fadeInUp" style={{ animationDelay: `${todayChats.length * 0.05}s` }}>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider px-3 py-2 drop-shadow-sm">
                  Sebelumnya
                </p>
                {olderChats.map((chat, idx) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChatId === chat.id}
                    isDeleting={deletingId === chat.id}
                    onSelect={handleSelectChat}
                    onDelete={handleDelete}
                    delay={(todayChats.length + idx) * 0.05}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 sm:p-5 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-smooth"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Burger button with animation */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-5 left-4 z-50 p-3 glass-card rounded-[14px] shadow-[var(--shadow-glass)] hover:shadow-[var(--shadow-elevated)] transition-all hover:scale-105 active:scale-95"
      >
        <div className="w-5 h-5 relative flex flex-col justify-center gap-1.5">
          <span className="w-full h-0.5 bg-white rounded-full transition-transform" />
          <span className="w-full h-0.5 bg-white rounded-full transition-transform" />
          <span className="w-full h-0.5 bg-white rounded-full transition-transform" />
        </div>
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fadeInUp"
          onClick={() => setIsMobileOpen(false)}
          style={{ animationDuration: '0.2s' }}
        />
      )}

      {/* Desktop sidebar - glassmorphism */}
      <aside className="hidden lg:flex flex-col w-80 glass-dark h-full shrink-0 border-r border-white/10">
        <SidebarContent />
      </aside>

      {/* Mobile drawer - glassmorphism with smooth animation */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-80 glass-dark flex flex-col border-r border-white/10 shadow-[var(--shadow-elevated)] transition-transform duration-300 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

function ChatItem({
  chat,
  isActive,
  isDeleting,
  onSelect,
  onDelete,
  delay = 0,
}: {
  chat: ChatSession;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: (c: ChatSession) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  delay?: number;
}) {
  return (
    <div
      onClick={() => onSelect(chat)}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none animate-slideInRight ${
        isActive
          ? 'bg-white/20 text-white shadow-md'
          : 'hover:bg-white/10 text-white/80 hover:text-white'
      }`}
      style={{ animationDelay: `${delay}s` }}
    >
      <MessageSquare
        className={`w-4 h-4 shrink-0 drop-shadow ${isActive ? 'text-white' : 'text-white/50'}`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate drop-shadow-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
          {chat.title}
        </p>
      </div>
      <button
        onClick={(e) => onDelete(e, chat.id)}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 transition-all shrink-0"
        title="Hapus"
      >
        {isDeleting ? (
          <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
        ) : (
          <Trash2 className="w-3.5 h-3.5 text-red-400 drop-shadow" />
        )}
      </button>
    </div>
  );
}
