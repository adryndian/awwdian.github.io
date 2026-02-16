'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { InputArea } from './InputArea';
import { MessageBubble } from './MessageBubble';
import { CostToast } from './CostToast';
import { ModelSelector } from './ModelSelector';
import { Message, ModelId, UsageInfo, ExtractedFile } from '@/types';
import { MODELS, DEFAULT_MODEL, calculateCost } from '@/lib/models/config';
import { v4 as uuidv4 } from 'uuid';
import { ArrowDown } from 'lucide-react';

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [lastUsage, setLastUsage] = useState<UsageInfo | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (files?: ExtractedFile[]) => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      files,
    };

    const assistantId = uuidv4();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      model: selectedModel,
      isStreaming: MODELS[selectedModel].supportsStreaming,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      const model = MODELS[selectedModel];
      
      if (model.supportsStreaming) {
        // DeepSeek streaming
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            model: selectedModel,
            files,
          }),
        });

        if (!response.body) throw new Error('No stream');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let finalUsage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, content: fullContent }
                      : m
                  ));
                }
                if (parsed.usage) {
                  finalUsage = parsed.usage;
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        // Finalize
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { 
                ...m, 
                content: fullContent, 
                isStreaming: false,
                tokens: { input: finalUsage.inputTokens, output: finalUsage.outputTokens },
                cost: finalUsage.costUSD,
              }
            : m
        ));
        
        setLastUsage({
          model: selectedModel,
          inputTokens: finalUsage.inputTokens,
          outputTokens: finalUsage.outputTokens,
          costUSD: finalUsage.costUSD,
        });

      } else {
        // Claude non-streaming with simulation
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            model: selectedModel,
            files,
          }),
        });

        const data = await response.json();
        
        // Simulate typing effect
        const fullContent = data.content;
        const chars = fullContent.split('');
        let currentContent = '';
        
        for (let i = 0; i < chars.length; i += 3) {
          currentContent += chars.slice(i, i + 3).join('');
          setMessages(prev => prev.map(m => 
            m.id === assistantId 
              ? { ...m, content: currentContent, isStreaming: true }
              : m
          ));
          await new Promise(r => setTimeout(r, 15));
        }

        // Finalize
        setMessages(prev => prev.map(m => 
          m.id === assistantId 
            ? { 
                ...m, 
                content: fullContent, 
                isStreaming: false,
                tokens: data.usage,
                cost: data.cost,
              }
            : m
        ));

        setLastUsage({
          model: selectedModel,
          inputTokens: data.usage.input,
          outputTokens: data.usage.output,
          costUSD: data.cost,
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Remove assistant message on error
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Header */}
      <GlassCard className="mx-4 mt-4 p-3 flex items-center justify-between z-20">
        <ModelSelector 
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          disabled={isLoading}
        />
        <div className="text-xs text-white/50">
          {messages.length} messages
        </div>
      </GlassCard>

      {/* Chat Area */}
      <div 
        ref={chatContainerRef}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
          setShowScrollButton(!isNearBottom);
        }}
        className="flex-1 overflow-y-auto p-4 space-y-6 relative"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40 space-y-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-2xl">
              <span className="text-5xl font-bold text-white">AI</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to chat</h2>
              <p className="text-white/60">Select a model and start the conversation</p>
            </div>
          </div>
        ) : (
          messages.map((message, idx) => (
            <MessageBubble 
              key={message.id} 
              message={message}
              isLast={idx === messages.length - 1}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-32 right-8 p-2 rounded-full bg-[#007AFF] text-white shadow-lg hover:bg-[#0051D5] transition-colors z-30"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 pb-8 z-20">
        <InputArea
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isLoading={isLoading}
          placeholder={`Message ${MODELS[selectedModel].name}...`}
          acceptFiles={true}
          acceptImages={false} // Text only untuk sekarang
        />
      </div>

      {/* Cost Toast */}
      <CostToast 
        usage={lastUsage}
        onClose={() => setLastUsage(null)}
      />
    </div>
  );
}
