'use client';

import { AlertCircle, Bot, RotateCw, User } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
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
      return <div className="leading-loose">{message.content}</div>;

    case 'tool':
      return <ToolDisplay message={message} />;

    case 'routing':
      return <RoutingDisplay message={message} />;

    case 'bot':
      return (
        <div className="max-w-none leading-loose">
          <ChatMessageMarkdown isStreaming={message.isStreaming}>
            {message.content}
          </ChatMessageMarkdown>
        </div>
      );

    case 'error':
      return (
        <div className="text-destructive">
          <p className="font-medium">{t('common.somethingWentWrong')}</p>
        </div>
      );

    case 'restream':
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-muted-foreground">
            <RotateCw className="h-3 w-3" />
            {t('restream.restreaming')} ({t('restream.attempt')}{' '}
            {message.retryCount})
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t('restream.previous')}:{' '}
            {message.previousLastEventType || 'unknown'} → {t('restream.last')}:{' '}
            {message.lastEventType || 'unknown'}
          </span>
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
  const { t } = useLanguage();
  const { resendMessage, isLoading } = useChatStore();

  const isUser = message.type === 'user';
  const isBot = message.type === 'bot';
  const isToolCall = message.type === 'tool';
  const isRouting = message.type === 'routing';
  const isError = message.type === 'error';
  const isRestream = message.type === 'restream';

  const showRetryButton =
    isError &&
    message.type === 'error' &&
    message.originalContent &&
    !message.isRetried;
  const showRetriedBadge =
    isError && message.type === 'error' && message.isRetried;

  const handleResend = () => {
    if (message.type === 'error' && message.originalContent) {
      resendMessage(message.originalContent);
    }
  };

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'justify-end' : 'justify-start',
        isToolCall || isRouting || isRestream ? 'mb-2' : 'mb-4'
      )}
    >
      {/* Bot/Error icon - shown on left for bot and error messages */}
      {(isBot || isError) && (
        <div className="flex-shrink-0 mt-1">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isError
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            )}
          >
            {isError ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
        </div>
      )}

      <div
        className={cn('flex flex-col gap-2 max-w-[80%]', isUser && 'items-end')}
      >
        <div
          className={cn(
            isUser
              ? 'p-3 bg-muted rounded-lg'
              : isError
                ? 'p-3 border border-destructive rounded-lg'
                : isRouting || isToolCall || isRestream
                  ? ''
                  : 'bg-background'
          )}
        >
          <MessageContent message={message} />
        </div>

        {/* Retry button - shown outside the error message box */}
        {showRetryButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isLoading}
            className="gap-2"
          >
            <RotateCw className="h-3.5 w-3.5" />
            {t('chat.retry')}
          </Button>
        )}

        {/* Retried badge - shown after retry button is clicked */}
        {showRetriedBadge && (
          <Badge variant="secondary" className="gap-1">
            <RotateCw className="h-3 w-3" />
            {t('chat.retried')}
          </Badge>
        )}
      </div>

      {/* User icon - shown on right for user messages */}
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  );
}
