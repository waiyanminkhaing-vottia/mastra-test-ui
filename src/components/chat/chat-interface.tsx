'use client';

import { ArrowDown, Bot } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DebugToggle } from '@/components/debug-toggle';
import { ErrorBoundary } from '@/components/error-boundary';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/language-context';
import { withBasePath } from '@/lib/base-path';
import { extractToolAction } from '@/lib/chat-utils';
import { UI_CONFIG } from '@/lib/config';
import { useChatStore } from '@/store/chat-store';

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
    currentToolName,
    debugMode,
    sendMessage,
    stopGeneration,
    initializeSession,
  } = useChatStore();
  const { t, isLoading: languageLoading } = useLanguage();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasUserScrolledUp = useRef(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (bottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      });
    }
  }, []);

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

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const filteredMessages = useMemo(() => {
    if (debugMode) {
      return messages;
    }
    return messages.filter(
      message =>
        message.type === 'user' ||
        message.type === 'bot' ||
        message.type === 'error'
    );
  }, [messages, debugMode]);

  const messagesLength = useMemo(
    () => filteredMessages.length,
    [filteredMessages.length]
  );
  const lastMessageId = useMemo(
    () => filteredMessages[filteredMessages.length - 1]?.id,
    [filteredMessages]
  );

  const handleAutoScroll = useCallback(() => {
    if (isMainStreaming || !hasUserScrolledUp.current || isAtBottom()) {
      scrollToBottom();
      hasUserScrolledUp.current = false;
      setShowScrollButton(false);
    }
  }, [isMainStreaming, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();
    if (!isMainStreaming && !atBottom) {
      hasUserScrolledUp.current = true;
      setShowScrollButton(true);
    } else if (atBottom) {
      hasUserScrolledUp.current = false;
      setShowScrollButton(false);
    }
  }, [isMainStreaming]);

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

  useEffect(() => {
    if (isMainStreaming) {
      const interval = setInterval(() => {
        if (!hasUserScrolledUp.current) {
          scrollToBottom();
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isMainStreaming, scrollToBottom]);

  // Return null while language is loading to prevent flash
  if (languageLoading) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        <a
          href="#chat-messages"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[100] bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          {t('chat.skipToMessages')}
        </a>
        <a
          href="#chat-input"
          className="sr-only focus:not-sr-only focus:absolute focus:top-16 focus:left-4 z-[100] bg-primary text-primary-foreground px-4 py-2 rounded"
        >
          {t('chat.skipToInput')}
        </a>

        <div className="fixed top-4 left-4 z-50">
          <DebugToggle />
        </div>
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {showScrollButton && (
          <Button
            onClick={() => {
              scrollToBottom();
              hasUserScrolledUp.current = false;
              setShowScrollButton(false);
            }}
            size="icon"
            className="fixed bottom-24 right-8 z-50 rounded-full shadow-lg"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}

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
                    src={withBasePath('/brand.png')}
                    alt="Vottia AI Assistant Logo"
                    width="150"
                    height="30"
                    priority
                    className="w-auto h-16"
                  />
                  <p id="welcome-heading" className="text-sm">
                    {t('chat.welcome')}
                  </p>
                </div>
              </div>
            ) : (
              <MessageList messages={filteredMessages} />
            )}

            {isMainStreaming && (
              <div className="flex items-start gap-3 mb-4">
                {/* Bot icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>

                {/* Streaming text and dots */}
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground animate-pulse">
                    {currentToolName
                      ? t(
                          `toolActions.${extractToolAction(currentToolName)}` as 'toolActions.default'
                        )
                      : t('chat.thinking')}
                  </span>
                  <span className="flex gap-1 items-end">
                    {UI_CONFIG.THINKING_DOT_DELAYS.map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                        style={{
                          animationDelay: delay,
                          animationDuration:
                            UI_CONFIG.THINKING_DOT_ANIMATION_DURATION,
                        }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div ref={bottomRef} className="h-1" />
        </ScrollArea>

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
                  <p>{t('chat.unavailable')}</p>
                </div>
              }
            >
              <div id="chat-input">
                <ChatInput
                  onSendMessage={(content: string) => {
                    try {
                      sendMessage(content);
                      setTimeout(scrollToBottom, UI_CONFIG.AUTO_SCROLL_DELAY);
                    } catch {
                      // Silently handled
                    }
                  }}
                  isLoading={isLoading}
                  onStop={stopGeneration}
                  placeholder={t('chat.inputPlaceholder')}
                />
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
