'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
// Import LANGSUNG dari config.ts, bukan dari @/types
import { type ModelId, DEFAULT_MODEL, isValidModelId } from '@/lib/models/config';
// Import types lainnya dari @/types
import type { Message, AiStatus } from '@/types';

// Interface untuk komponen (sesuaikan jika ada tambahan props)
interface ChatContainerProps {
  initialModel?: ModelId;
}

export default function ChatContainer({ initialModel }: ChatContainerProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fix: Import dari config.ts memastikan DEFAULT_MODEL bertipe ModelId
  const [selectedModel, setSelectedModel] = useState<ModelId>(initialModel || DEFAULT_MODEL);
  
  const [cost, setCost] = useState<number | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  
  // Ref untuk auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto scroll ke bawah saat ada pesan baru
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handler untuk kirim pesan (contoh implementasi)
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setAiStatus("loading");

    // Tambah pesan user
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          modelId: selectedModel,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Tambah pesan assistant
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        model: selectedModel,
        cost: data.usage ? (data.usage.inputTokens + data.usage.outputTokens) * 0.000003 : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCost(data.cost || null);
      setAiStatus("idle");

    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setAiStatus("error");
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedModel]);

  // Handler untuk ganti model
  const handleModelChange = useCallback((newModel: string) => {
    if (isValidModelId(newModel)) {
      setSelectedModel(newModel);
    } else {
      console.error('Invalid model selected:', newModel);
    }
  }, []);

  return (
    <div className="chat-container">
      {/* Area pesan */}
      <div className="messages-area">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>Mulai chat dengan model pilihan Anda</p>
            <ul>
              <li>Claude Opus 4.6 = Coding expert (lambat, mahal)</li>
              <li>Claude Sonnet 4.0 = Balance (cepat, medium)</li>
              <li>Llama 4 Maverick = Efficient (cepat, murah)</li>
            </ul>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-header">
              {msg.role === 'user' ? 'You' : msg.model || 'AI'}
            </div>
            <div className="message-content">{msg.content}</div>
            {msg.thinking && (
              <div className="thinking-block">
                <strong>Thinking:</strong> {msg.thinking}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="loading-indicator">
            <span>AI sedang berpikir...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Area input (simplified) */}
      <div className="input-area">
        <select 
          value={selectedModel} 
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={isLoading}
        >
          <option value="us.anthropic.claude-opus-4-6-v1">
            Claude Opus 4.6 (High)
          </option>
          <option value="us.anthropic.claude-sonnet-4-0-v1">
            Claude Sonnet 4.0 (Medium)
          </option>
          <option value="us.meta.llama4-maverick-17b-instruct-v1">
            Llama 4 Maverick (Low)
          </option>
        </select>
        
        {/* Tambahkan komponen input sesuai kebutuhan Anda */}
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
      
      {cost && (
        <div className="cost-display">
          Cost: ${cost.toFixed(4)}
        </div>
      )}
    </div>
  );
}
