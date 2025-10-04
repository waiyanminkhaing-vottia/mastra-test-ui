'use client';

import { ArrowRight, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/language-context';
import type { RoutingMessage } from '@/types/chat';

interface RoutingDisplayProps {
  message: RoutingMessage;
}

/**
 * Routing display component for rendering routing messages with collapsible details
 */
export function RoutingDisplay({ message }: RoutingDisplayProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = message.prompt || message.selectionReason;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <div className="flex gap-1">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronsUpDown />
            <span className="sr-only">{t('tool.toggle')}</span>
          </Button>
        </CollapsibleTrigger>
        <div className="flex items-center gap-2">
          {message.start && <Badge variant="outline">{message.start}</Badge>}
          {message.isStreaming ? (
            <>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="h-5 w-20 bg-muted animate-pulse rounded-md" />
            </>
          ) : (
            message.end && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{message.end}</Badge>
              </>
            )
          )}
        </div>
      </div>
      {hasDetails && (
        <CollapsibleContent className="border border-border rounded-lg p-4 mt-1">
          <div className="flex flex-col gap-2">
            {message.prompt && (
              <div>
                <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                  <span>📝</span>
                  <span>{t('routing.prompt')}</span>
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {message.prompt}
                </p>
              </div>
            )}
            {message.selectionReason && (
              <div>
                <h5 className="text-xs font-medium mb-2 flex items-center gap-1">
                  <span>💡</span>
                  <span>{t('routing.selectionReason')}</span>
                </h5>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {message.selectionReason}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
