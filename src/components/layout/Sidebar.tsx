'use client';

import { useState } from 'react';
import {
  Plus, Search, MessageSquare, Trash2,
  LogOut, X, Sparkles
} from 'lucide-react';
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

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const now = Date.now();
  const todayChats  = filtered.filter((c) => now - c.updatedAt.getTime() < 86_400_000);
  const olderChats  = filtered.filter((c) => now - c.updatedAt.getTime() >= 86_400_000);

  const handleSelect = (chat: ChatSession) => {
    onSelectChat(chat);
    setIsMobileOpen(false);
  };

  const handleNew = () => {
    onNewChat();
    setIsMobileOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm('Hapus percakapan ini?')) return;
    setDeletingId(chatId);
    try { await onDeleteChat(chatId); }
    catch (err) { console.error('Delete error:', err); }
    finally { setDeletingId(null); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  /* ─── Shared inner content ─────────────────────────────────────── */
  const Content = () => (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-[15px] tracking-tight">
              BeckRock AI
            </span>
          </div>
          {/* Close button — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-smooth"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat */}
        <button
          onClick={handleNew}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl
                     bg-gradient-to-r from-violet-500 to-blue-500
                     hover:from-violet-600 hover:to-blue-600
                     text-white text-sm font-semibold
                     shadow-lg shadow-violet-500/25
                     transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Chat Baru
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-sm text-white
                       placeholder-white/35 focus:outline-none"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 animate-fadeInUp">
            <MessageSquare className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-sm text-white/35">
              {searchQuery ? 'Tidak ditemukan' : 'Belum ada percakapan'}
            </p>
          </div>
        ) : (
          <>
            {todayChats.length > 0 && (
              <section className="animate-fadeInUp">
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest px-3 py-2">
                  Hari ini
                </p>
                {todayChats.map((chat, i) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    active={currentChatId === chat.id}
                    deleting={deletingId === chat.id}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    delay={i * 0.04}
                  />
                ))}
              </section>
            )}
            {olderChats.length > 0 && (
              <section className="mt-1 animate-fadeInUp">
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest px-3 py-2">
                  Sebelumnya
                </p>
                {olderChats.map((chat, i) => (
                  <ChatRow
                    key={chat.id}
                    chat={chat}
                    active={currentChatId === chat.id}
                    deleting={deletingId === chat.id}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    delay={(todayChats.length + i) * 0.04}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-white/8">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl
                     text-sm text-white/50 hover:text-white/90
                     hover:bg-white/8 transition-smooth"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Burger button (mobile only) ───────────────────────────────── */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-[14px] glass-card
                   shadow-[var(--shadow-glass)] hover:shadow-[var(--shadow-elevated)]
                   transition-all hover:scale-105 active:scale-95"
      >
        <div className="flex flex-col gap-1.5 w-5">
          <span className="h-0.5 bg-white rounded-full" />
          <span className="h-0.5 bg-white rounded-full w-3.5" />
          <span className="h-0.5 bg-white rounded-full" />
        </div>
      </button>

      {/* ── Mobile backdrop ───────────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          style={{ animation: 'fadeInUp 0.2s ease both' }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 glass-dark border-r border-white/8 h-full">
        <Content />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col glass-dark
                    border-r border-white/8 shadow-[var(--shadow-elevated)]
                    transition-transform duration-300 ease-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Content />
      </aside>
    </>
  );
}

/* ─── Chat row item ────────────────────────────────────────────────────── */
function ChatRow({
  chat, active, deleting, onSelect, onDelete, delay,
}: {
  chat: ChatSession;
  active: boolean;
  deleting: boolean;
  onSelect: (c: ChatSession) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  delay?: number;
}) {
  return (
    <div
      onClick={() => onSelect(chat)}
      className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer
                  transition-smooth select-none animate-slideInLeft ${
        active
          ? 'bg-white/15 text-white'
          : 'text-white/60 hover:text-white/90 hover:bg-white/8'
      }`}
      style={{ animationDelay: `${delay ?? 0}s` }}
    >
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-white/35'}`} />
      <p className={`flex-1 text-sm truncate ${active ? 'font-semibold' : 'font-normal'}`}>
        {chat.title}
      </p>
      <button
        onClick={(e) => onDelete(e, chat.id)}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg
                   hover:bg-red-500/20 transition-smooth shrink-0"
      >
        {deleting ? (
          <div className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3 text-red-400" />
        )}
      </button>
    </div>
  );
}
