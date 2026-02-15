'use client'

import { useState, useRef, useEffect } from 'react'
import MessageList from './MessageList'
import InputArea from './InputArea'
import Sidebar from './Sidebar'
import { Message, ChatSession } from '@/types/chat'
import { v4 as uuidv4 } from 'uuid'

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          chatId: currentChatId
        })
      })

      const data = await response.json()

      if (data.content) {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-claude-bg text-claude-text overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-claude-sidebar transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar 
          onNewChat={startNewChat}
          currentChatId={currentChatId}
          onSelectChat={setCurrentChatId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center p-4 bg-claude-sidebar border-b border-claude-border">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-claude-input rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-3 font-semibold">Claude Chat</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-claude-muted">
              <h1 className="text-3xl font-bold mb-2">Claude</h1>
              <p>How can I help you today?</p>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-claude-bg border-t border-claude-border">
          <InputArea 
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
