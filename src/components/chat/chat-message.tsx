'use client';

import { Copy, MoreHorizontal, ThumbsDown, ThumbsUp } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
    avatar?: string;
    name?: string;
  };
  isStreaming?: boolean;
}

/**
 * Individual chat message component with user/assistant styling and actions.
 * @param props - The component props
 * @param props.message - The message data to display
 * @param props.isStreaming - Whether the message is currently streaming
 */
export function ChatMessage({
  message,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  /**
   * Copies the message content to clipboard.
   */
  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <Badge variant="secondary" className="text-xs">
          {message.content}
        </Badge>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-4 p-4 group',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.avatar} />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col max-w-[80%]', isUser && 'items-end')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? 'You' : message.name || 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <Card className={cn(isUser && 'bg-primary text-primary-foreground')}>
          <CardContent className="p-3">
            <div className="prose prose-sm max-w-none">
              {message.content}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
              )}
            </div>
          </CardContent>
        </Card>

        {!isUser && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ThumbsUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <ThumbsDown className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={copyToClipboard}>
                  Copy message
                </DropdownMenuItem>
                <DropdownMenuItem>Regenerate</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.avatar} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
