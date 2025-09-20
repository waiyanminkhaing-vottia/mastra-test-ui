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
  const bottomRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls to the bottom of the chat area.
   */
  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  };

  /**
   * Checks if the user is at or near the bottom of the scroll area.
   */
  const isAtBottom = (): boolean => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollElement) {
        const threshold = 100; // pixels from bottom
        return (
          scrollElement.scrollTop + scrollElement.clientHeight + threshold >=
          scrollElement.scrollHeight
        );
      }
    }
    return false;
  };

  // Initialize session on component mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Auto-scroll to bottom when new messages are added, but only if user is at bottom
  useEffect(() => {
    if (isAtBottom()) {
      scrollToBottom();
    }
  }, [messages]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Fixed theme toggle */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-2xl mx-auto mt-16 pb-32">
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

          {/* Invisible bottom anchor for scrolling - placed after padding */}
          <div ref={bottomRef} className="h-1" />
        </ScrollArea>

        {/* Fixed Chat Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40">
          <div className="max-w-2xl mx-auto">
            <ChatInput
              onSendMessage={(content: string) => {
                sendMessage(content);
                // Scroll to bottom immediately when user sends a message
                setTimeout(scrollToBottom, 100);
              }}
              isLoading={isLoading}
              onStop={stopGeneration}
              placeholder="Ask Mastra AI anything..."
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
