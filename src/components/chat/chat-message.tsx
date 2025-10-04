'use client';

import { AlertCircle } from 'lucide-react';

import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import type { MessageTypes } from '@/types/chat';

import { ChatMessageMarkdown } from './chat-message-markdown';
import { RoutingDisplay } from './routing-display';
import { ToolDisplay } from './tool-display';

interface ChatMessageProps {
  message: MessageTypes;
}

const MessageContent = ({ message }: ChatMessageProps) => {
  const { t } = useLanguage();

  switch (message.type) {
    case 'user':
      return <>{message.content}</>;

    case 'tool':
      return <ToolDisplay message={message} />;

    case 'routing':
      return <RoutingDisplay message={message} />;

    case 'bot':
      return (
        <div className="max-w-none">
          <ChatMessageMarkdown isStreaming={message.isStreaming}>
            {message.content}
          </ChatMessageMarkdown>
        </div>
      );

    case 'error':
      return (
        <div className="flex items-start gap-2 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{t('common.somethingWentWrong')}</p>
          </div>
        </div>
      );

    default:
      return null;
  }
};

/**
 * Individual chat message component with user/assistant styling and markdown support.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.type === 'user';
  const isToolCall = message.type === 'tool';
  const isRouting = message.type === 'routing';
  const isError = message.type === 'error';

  return (
    <div
      className={cn(
        'flex gap-4',
        isUser ? 'justify-end' : 'justify-start',
        isToolCall || isRouting ? 'mb-2' : 'mb-4'
      )}
    >
      <div className={cn('flex flex-col max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            isUser
              ? 'p-3 bg-muted rounded-lg'
              : isError
                ? 'p-3 border border-destructive rounded-lg'
                : isRouting || isToolCall
                  ? ''
                  : 'bg-background'
          )}
        >
          <MessageContent message={message} />
        </div>
      </div>
    </div>
  );
}
