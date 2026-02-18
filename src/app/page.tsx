'use client';

import { useChat } from '@/hooks/useChat';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { MODELS } from '@/lib/models/config';
import { useState } from 'react';

export default function ChatPage() {
  const { messages, isLoading, currentModel, setCurrentModel, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState('');
  const [enableThinking, setEnableThinking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    await sendMessage(input, enableThinking);
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
      <header className="border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">AI Chat Multi-Model</h1>
        <ModelSelector 
          models={Object.values(MODELS)}
          currentModel={currentModel}
          onSelect={setCurrentModel}
          disabled={isLoading}
        />
        
        {/* Toggle Thinking untuk Opus 4.6 */}
        {currentModel === 'us.anthropic.claude-opus-4-6-v1:0' && (
          <label className="flex items-center gap-2 mt-2 text-sm">
            <input 
              type="checkbox" 
              checked={enableThinking}
              onChange={(e) => setEnableThinking(e.target.checked)}
              className="rounded"
            />
            <span>Enable Extended Thinking (Opus 4.6)</span>
          </label>
        )}
        
        <button 
          onClick={clearChat}
          className="mt-2 text-sm text-red-500 hover:text-red-700"
          disabled={isLoading}
        >
          Clear Chat
        </button>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p>Mulai chat dengan model pilihan Anda</p>
            <p className="text-sm mt-2">
              Claude Opus 4.6 = Coding expert (lambat, mahal)<br/>
              Claude Sonnet 4.0 = Balance (cepat, medium)<br/>
              Llama 4 Maverick = Efficient (cepat, murah)
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`p-3 rounded-lg ${
              msg.role === 'user' ? 'bg-blue-100 ml-auto max-w-[80%]' : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">
              {msg.role === 'user' ? 'You' : msg.model || 'AI'}
            </div>
            <div className="whitespace-pre-wrap">{msg.content}</div>
            {msg.thinking && (
              <div className="mt-2 p-2 bg-purple-50 rounded text-sm text-purple-800">
                <strong>Thinking:</strong> {msg.thinking}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pesan..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button 
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
