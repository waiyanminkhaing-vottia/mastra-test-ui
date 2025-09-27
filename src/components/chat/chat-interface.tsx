'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { DebugToggle } from '@/components/debug-toggle';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemeToggle } from '@/components/theme-toggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UI_CONFIG } from '@/lib/config';
import { useChatStore } from '@/store/chat-store';

import { StreamingIndicator } from '../ui/streaming-indicator';
import { ChatInput } from './chat-input';
import { MessageList } from './message-list';

/**
 * Main chat interface component that manages the conversation flow.
 */
export function ChatInterface() {
  const {
    messages,
    isLoading,
    isMainStreaming,
    debugMode,
    sendMessage,
    stopGeneration,
    initializeSession,
  } = useChatStore();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls to the bottom of the chat area.
   */
  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      });
    }
  }, []);

  /**
   * Checks if the user is at or near the bottom of the scroll area.
   */
  const isAtBottom = (): boolean => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollElement) {
        return (
          scrollElement.scrollTop +
            scrollElement.clientHeight +
            UI_CONFIG.SCROLL_THRESHOLD >=
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

  // Filter messages based on debug mode
  const filteredMessages = useMemo(() => {
    if (debugMode) {
      return messages; // Show all messages in debug mode
    }
    // In normal mode, only show user and bot messages
    return messages.filter(
      message => message.type === 'user' || message.type === 'bot'
    );
  }, [messages, debugMode]);

  // Memoize the messages length to avoid re-renders on message content changes
  const messagesLength = useMemo(
    () => filteredMessages.length,
    [filteredMessages.length]
  );
  const lastMessageId = useMemo(
    () => filteredMessages[filteredMessages.length - 1]?.id,
    [filteredMessages]
  );

  // Track if user has manually scrolled up (to prevent auto-scroll when user is reading)
  const hasUserScrolledUp = useRef(false);

  // Auto-scroll to bottom when new messages are added or during streaming
  const handleAutoScroll = useCallback(() => {
    // Always scroll to bottom during streaming or when user hasn't manually scrolled up
    if (isMainStreaming || !hasUserScrolledUp.current || isAtBottom()) {
      scrollToBottom();
      hasUserScrolledUp.current = false;
    }
  }, [isMainStreaming, scrollToBottom]);

  // Handle user scroll events to detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!isMainStreaming && !isAtBottom()) {
      hasUserScrolledUp.current = true;
    }
  }, [isMainStreaming]);

  // Attach scroll listener to detect manual user scrolling
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    handleAutoScroll();
  }, [messagesLength, lastMessageId, isMainStreaming, handleAutoScroll]);

  // Additional effect to handle frequent scrolling during streaming
  // This helps with list content where height changes dynamically
  useEffect(() => {
    if (isMainStreaming) {
      const interval = setInterval(() => {
        if (!hasUserScrolledUp.current) {
          scrollToBottom();
        }
      }, 100); // Scroll every 100ms during streaming

      return () => clearInterval(interval);
    }
  }, [isMainStreaming, scrollToBottom]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Skip links for accessibility */}
        <a
          href="#chat-messages"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          Skip to chat messages
        </a>
        <a
          href="#chat-input"
          className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 z-[100] bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          Skip to message input
        </a>

        {/* Fixed controls */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <DebugToggle />
          <ThemeToggle />
        </div>

        {/* Messages Area */}
        <ScrollArea
          ref={scrollAreaRef}
          className="flex-1"
          role="log"
          aria-live="polite"
          aria-label="Chat conversation"
        >
          <div id="chat-messages" className="max-w-2xl mx-auto mt-16 pb-32">
            {messagesLength === 0 ? (
              <div
                className="flex items-center justify-center min-h-[60vh] text-muted-foreground"
                role="banner"
                aria-labelledby="welcome-heading"
              >
                <div className="text-center space-y-5">
                  <Image
                    src="/brand.png"
                    alt="Vottia AI Assistant Logo"
                    width="150"
                    height="30"
                    priority
                    className="w-auto h-16"
                  />
                  <p id="welcome-heading" className="text-sm">
                    修理受付AIエージェントです。
                  </p>
                </div>
              </div>
            ) : (
              <MessageList messages={filteredMessages} />
            )}

            {/* Show main streaming indicator when isMainStreaming is true */}
            {isMainStreaming && <StreamingIndicator />}
          </div>

          {/* Invisible bottom anchor for scrolling - placed after padding */}
          <div ref={bottomRef} className="h-1" />
        </ScrollArea>

        {/* Fixed Chat Input */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40"
          role="region"
          aria-label="Message input area"
        >
          <div className="max-w-2xl mx-auto">
            <ErrorBoundary
              fallback={
                <div
                  className="p-4 text-center text-muted-foreground"
                  role="alert"
                >
                  <p>Chat input unavailable. Please refresh the page.</p>
                </div>
              }
            >
              <div id="chat-input">
                <ChatInput
                  onSendMessage={(content: string) => {
                    try {
                      sendMessage(content);
                      // Scroll to bottom immediately when user sends a message
                      setTimeout(scrollToBottom, UI_CONFIG.AUTO_SCROLL_DELAY);
                    } catch {
                      // Error is already logged by the sendMessage function
                      // Could show user notification here
                    }
                  }}
                  isLoading={isLoading}
                  onStop={stopGeneration}
                  placeholder="Ask Mastra AI anything..."
                />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
