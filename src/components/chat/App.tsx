'use client';

import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_MODEL } from '@/lib/models/config';
import { getAllSessions, createSession, deleteSession, getSession, messagesToState, type ChatSessionData } from '@/lib/chatHistory';
import { ChatContainer } from './ChatContainer';

export default function App() {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    const all = getAllSessions();
    setSessions(all);
    if (all.length > 0) {
      setActiveId(all[0].id);
    } else {
      const s = createSession(DEFAULT_MODEL);
      setSessions([s]);
      setActiveId(s.id);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    const s = createSession(DEFAULT_MODEL);
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
    setSidebarOpen(false);
  }, []);

  const handleSelectChat = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  const handleDeleteChat = useCallback((id: string) => {
    deleteSession(id);
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) {
        if (next.length > 0) {
          setActiveId(next[0].id);
        } else {
          const s = createSession(DEFAULT_MODEL);
          setActiveId(s.id);
          return [s];
        }
      }
      return next;
    });
  }, [activeId]);

  const handleSessionUpdate = useCallback(() => {
    setSessions(getAllSessions());
  }, []);

  const activeSession = activeId ? getSession(activeId) : null;
  const initialMessages = activeSession ? messagesToState(activeSession) : [];
  const initialModel = activeSession?.model || DEFAULT_MODEL;

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={
        'fixed sm:relative z-50 sm:z-auto h-full w-72 shrink-0 border-r border-black/5 bg-white/70 backdrop-blur-xl flex flex-col transition-transform duration-200 ' +
        (sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0')
      }>
        {/* Sidebar header */}
        <div className="shrink-0 p-3 border-b border-black/5">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/30 active:scale-[0.98] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            New Chat
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={
                'group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ' +
                (session.id === activeId
                  ? 'bg-orange-50 text-orange-900 border border-orange-200/50'
                  : 'text-gray-600 hover:bg-gray-50 border border-transparent')
              }
              onClick={() => handleSelectChat(session.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(session.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteChat(session.id); }}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Delete chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="shrink-0 p-3 border-t border-black/5">
          <p className="text-[10px] text-gray-400 text-center">BeckRock AI • Personal Use</p>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 min-w-0">
        {activeId && (
          <ChatContainer
            key={activeId}
            sessionId={activeId}
            initialModel={initialModel}
            initialMessages={initialMessages}
            onSessionUpdate={handleSessionUpdate}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        )}
      </main>
    </div>
  );
}