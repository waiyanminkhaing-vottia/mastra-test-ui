'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MessageTypes } from '@/types/chat';

import { ChatMessageMarkdown } from './chat-message-markdown';
import { ToolDisplay } from './tool-display';

interface ChatMessageProps {
  message: MessageTypes;
}

const MessageContent = ({ message }: ChatMessageProps) => {
  switch (message.type) {
    case 'user':
      return <>{message.content}</>;

    case 'continue':
      return <Badge variant="outline">{message.content}</Badge>;

    case 'tool':
      return <ToolDisplay message={message} />;

    case 'bot':
      return (
        <div className="max-w-none">
          <ChatMessageMarkdown isStreaming={message.isStreaming}>
            {message.content}
          </ChatMessageMarkdown>
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

  return (
    <div
      className={cn(
        'flex gap-4',
        isUser ? 'justify-end' : 'justify-start',
        // Add extra spacing after tool calls to separate from following text messages
        isToolCall ? 'mb-2' : 'mb-4'
      )}
    >
      <div className={cn('flex flex-col max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            isUser
              ? 'p-3 bg-muted rounded-lg'
              : isToolCall
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
