'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useChatStore } from '@/store/chat-store';
import type { BotMessage, ToolCallMessage, UserMessage } from '@/types/chat';

import { StreamingIndicator } from '../ui/streaming-indicator';
import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';

/**
 * Main chat interface component that manages the conversation flow.
 */
export function ChatInterface() {
  const {
    messages,
    isLoading,
    isMainStreaming,
    sendMessage,
    stopGeneration,
    initializeSession,
  } = useChatStore();
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

  // Initialize session on component mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Header with theme toggle */}
        <div className="flex justify-end p-4 border-b border-border">
          <ThemeToggle />
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-2xl mx-auto mt-16 pb-4">
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
                  message={
                    message as UserMessage | BotMessage | ToolCallMessage
                  }
                />
              ))
            )}

            {/* Show main streaming indicator when isMainStreaming is true */}
            {isMainStreaming && <StreamingIndicator />}
          </div>
        </ScrollArea>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isLoading}
          onStop={stopGeneration}
          placeholder="Ask Mastra AI anything..."
        />
      </div>
    </TooltipProvider>
  );
}
