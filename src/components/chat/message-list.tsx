import { memo } from 'react';

import type { MessageTypes } from '@/types/chat';

import { ChatMessage } from './chat-message';

interface MessageListProps {
  messages: MessageTypes[];
}

/**
 * Optimized message list component that prevents unnecessary re-renders
 * by memoizing the entire list and only re-rendering when messages change
 */
export const MessageList = memo<MessageListProps>(({ messages }) => {
  return (
    <div role="log" aria-live="polite" aria-label="Chat messages">
      {messages.map(message => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
});

MessageList.displayName = 'MessageList';
