'use client';

import { Bug, BugOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/language-context';
import { useChatStore } from '@/store/chat-store';

/**
 * Debug mode toggle component that controls message visibility
 */
export function DebugToggle() {
  const { debugMode, isLoading, toggleDebugMode } = useChatStore();
  const { t } = useLanguage();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={debugMode ? 'default' : 'outline'}
          size="sm"
          onClick={toggleDebugMode}
          disabled={isLoading}
          className="p-2"
          aria-label={debugMode ? t('debug.disable') : t('debug.enable')}
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
          {isLoading
            ? t('debug.disabledWhileLoading')
            : debugMode
              ? t('debug.modeOn')
              : t('debug.modeOff')}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
