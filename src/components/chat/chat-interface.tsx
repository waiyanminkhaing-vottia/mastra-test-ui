'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';

import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  avatar?: string;
  name?: string;
}

/**
 * Main chat interface component that manages the conversation flow.
 */
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls to the bottom of the chat area.
   */
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  /**
   * Handles sending a new message.
   * @param content - The message content
   */
  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
  };

  /**
   * Handles stopping message generation.
   */
  const handleStop = () => {
    setIsLoading(false);
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-4xl mx-auto py-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
                <div className="text-center space-y-5">
                  <Image
                    src="/brand.png"
                    alt="Vottia Brand"
                    width="150"
                    height="30"
                    priority
                    className="w-auto h-16"
                  />
                  <p className="text-sm">修理受付AIエージェントです。</p>
                </div>
              </div>
            ) : (
              messages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLoading && message.content === ''}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStop={handleStop}
          placeholder="Ask Mastra AI anything..."
        />
      </div>
    </TooltipProvider>
  );
}
