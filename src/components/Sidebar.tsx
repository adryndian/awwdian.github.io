'use client'

import { useEffect, useState } from 'react'
import { Chat } from '@/lib/supabase'

interface Props {
  onNewChat: () => void
  currentChatId: string | null
  onSelectChat: (id: string) => void
}

export default function Sidebar({ onNewChat, currentChatId, onSelectChat }: Props) {
  const [chats, setChats] = useState<Chat[]>([])

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    const res = await fetch('/api/chats')
    const data = await res.json()
    setChats(data)
  }

  return (
    <div className="flex flex-col h-full bg-claude-sidebar">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-claude-input hover:bg-claude-border text-claude-text py-3 px-4 rounded-lg transition-colors border border-claude-border"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`
              w-full text-left px-3 py-2 rounded-lg truncate text-sm transition-colors
              ${currentChatId === chat.id 
                ? 'bg-claude-input text-claude-text' 
                : 'text-claude-muted hover:bg-claude-input hover:text-claude-text'
              }
            `}
          >
            {chat.title}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-claude-border">
        <div className="flex items-center gap-3 text-claude-muted text-sm">
          <div className="w-8 h-8 rounded-full bg-claude-accent flex items-center justify-center text-white font-semibold">
            U
          </div>
          <span>User</span>
        </div>
      </div>
    </div>
  )
}
