'use client';

import { useState, useEffect } from 'react';
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
  isLoading?: boolean;
}

export function Sidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  isLoading,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Close sidebar on mobile when chat selected
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

  // Group chats by recency
  const now = new Date();
  const todayChats = filteredChats.filter(
    (c) => now.getTime() - c.updatedAt.getTime() < 86400000
  );
  const olderChats = filteredChats.filter(
    (c) => now.getTime() - c.updatedAt.getTime() >= 86400000
  );

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setDeletingId(chatId);
    try {
      await supabase.from('messages').delete().eq('chat_id', chatId);
      const { error } = await supabase.from('chats').delete().eq('id', chatId);
      if (!error) window.location.reload();
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-[15px]">BeckRock AI</span>
          </div>
          <button
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100 text-[var(--text-muted)]"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Chat Baru</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-100 rounded-xl pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:bg-gray-50 focus:ring-1 focus:ring-[var(--accent-blue)]/30 transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">
              {searchQuery ? 'Tidak ditemukan' : 'Belum ada percakapan'}
            </p>
          </div>
        ) : (
          <>
            {todayChats.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1.5">
                  Hari ini
                </p>
                {todayChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChatId === chat.id}
                    isDeleting={deletingId === chat.id}
                    onSelect={handleSelectChat}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
            {olderChats.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1.5 mt-2">
                  Sebelumnya
                </p>
                {olderChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={currentChatId === chat.id}
                    isDeleting={deletingId === chat.id}
                    onSelect={handleSelectChat}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-subtle)]">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-gray-100 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 bg-white rounded-xl border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
      >
        <Menu className="w-4 h-4 text-[var(--text-secondary)]" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)] h-full shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-[var(--shadow-lg)] flex flex-col transition-transform duration-300 ease-out ${
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
}: {
  chat: ChatSession;
  isActive: boolean;
  isDeleting: boolean;
  onSelect: (c: ChatSession) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(chat)}
      className={`group flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer transition-all select-none ${
        isActive
          ? 'bg-[var(--accent-blue-light)] text-[var(--accent-blue)]'
          : 'hover:bg-gray-100 text-[var(--text-secondary)]'
      }`}
    >
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--accent-blue)]' : 'text-gray-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
          {chat.title}
        </p>
      </div>
      <button
        onClick={(e) => onDelete(e, chat.id)}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-100 transition-all shrink-0"
        title="Hapus"
      >
        {isDeleting ? (
          <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3 text-red-400" />
        )}
      </button>
    </div>
  );
}
