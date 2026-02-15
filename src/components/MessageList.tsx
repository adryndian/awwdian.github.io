'use client'

import { Message } from '@/types/chat'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  messages: Message[]
}

export default function MessageList({ messages }: Props) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {messages.map((message) => (
        <div 
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`
            max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 
            ${message.role === 'user' 
              ? 'bg-claude-accent text-white rounded-br-md' 
              : 'bg-claude-input text-claude-text rounded-bl-md'
            }
          `}>
            {message.role === 'assistant' ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
