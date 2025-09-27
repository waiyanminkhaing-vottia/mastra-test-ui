'use client';

import { Bug, BugOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useChatStore } from '@/store/chat-store';

/**
 * Debug mode toggle component that controls message visibility
 */
export function DebugToggle() {
  const { debugMode, isMainStreaming, toggleDebugMode } = useChatStore();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={debugMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleDebugMode}
          disabled={isMainStreaming}
          className="p-2"
          aria-label={debugMode ? 'Disable debug mode' : 'Enable debug mode'}
        >
          {debugMode ? (
            <Bug className="h-4 w-4" />
          ) : (
            <BugOff className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {isMainStreaming
            ? 'Debug mode disabled during streaming'
            : debugMode
              ? 'Debug mode: ON - showing all messages'
              : 'Debug mode: OFF - showing user/bot messages only'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
