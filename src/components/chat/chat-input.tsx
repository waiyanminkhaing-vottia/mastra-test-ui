'use client';

import { Send, Square } from 'lucide-react';
import { KeyboardEvent, memo, useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UI_CONFIG } from '@/lib/config';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Chat input component with send button and keyboard shortcuts.
 * @param props - The component props
 * @param props.onSendMessage - Callback when a message is sent
 * @param props.isLoading - Whether a response is being generated
 * @param props.onStop - Callback to stop generation
 * @param props.placeholder - Input placeholder text
 * @param props.maxLength - Maximum message length allowed
 */
const ChatInputComponent = ({
  onSendMessage,
  isLoading = false,
  onStop,
  placeholder = 'Type your message...',
  maxLength = UI_CONFIG.MESSAGE_INPUT_MAX_LENGTH,
}: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const isComposingRef = useRef(false);

  /**
   * Sanitizes user input to prevent XSS and clean up formatting
   */
  const sanitizeMessage = useCallback(
    (input: string): string => {
      return input
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .substring(0, maxLength); // Enforce length limit
    },
    [maxLength]
  );

  /**
   * Handles sending the message.
   */
  const handleSend = useCallback(() => {
    const sanitized = sanitizeMessage(message);

    if (sanitized && !isLoading && sanitized.length > 0) {
      onSendMessage(sanitized);
      setMessage('');
    }
  }, [message, isLoading, onSendMessage, sanitizeMessage]);

  /**
   * Handles input changes with length validation
   */
  const handleInputChange = useCallback(
    (value: string) => {
      if (value.length <= maxLength) {
        setMessage(value);
      }
    },
    [maxLength]
  );

  /**
   * Handles keyboard shortcuts in the textarea.
   * @param e - Keyboard event
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

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
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={isLoading}
            className={`min-h-[60px] max-h-[${UI_CONFIG.MESSAGE_INPUT_MAX_HEIGHT}px] resize-none`}
            rows={1}
            aria-label="Chat message input"
            aria-describedby="message-length-indicator"
          />
          {message.length >
            maxLength * UI_CONFIG.MESSAGE_LENGTH_WARNING_THRESHOLD && (
            <div
              id="message-length-indicator"
              className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-1 rounded"
            >
              {message.length}/{maxLength}
            </div>
          )}
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
};

/**
 *
 */
export const ChatInput = memo(ChatInputComponent);
