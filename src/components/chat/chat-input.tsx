'use client';

import { Send, Square } from 'lucide-react';
import { KeyboardEvent, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
  placeholder?: string;
}

/**
 * Chat input component with send button and keyboard shortcuts.
 * @param props - The component props
 * @param props.onSendMessage - Callback when a message is sent
 * @param props.isLoading - Whether a response is being generated
 * @param props.onStop - Callback to stop generation
 * @param props.placeholder - Input placeholder text
 */
export function ChatInput({
  onSendMessage,
  isLoading = false,
  onStop,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const isComposingRef = useRef(false);

  /**
   * Handles sending the message.
   */
  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  /**
   * Handles keyboard shortcuts in the textarea.
   * @param e - Keyboard event
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handles IME composition start (when typing Japanese, Chinese, etc.)
   */
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  /**
   * Handles IME composition end (when finishing typing Japanese, Chinese, etc.)
   */
  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  return (
    <>
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={isLoading}
            className="min-h-[60px] max-h-[200px] resize-none"
            rows={1}
          />
        </div>

        {isLoading ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onStop}
                className="shrink-0"
              >
                <Square className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Stop generation</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Send message (Enter)
              <br />
              New line (Shift + Enter)
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center mt-2 max-w-4xl mx-auto">
        Press Enter to send, Shift + Enter for new line
      </div>
    </>
  );
}
