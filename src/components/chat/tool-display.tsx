'use client';

import JsonView from '@uiw/react-json-view';
import { ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/language-context';
import type { ToolCallMessage } from '@/types/chat';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

interface ToolDisplayProps {
  message: ToolCallMessage;
}

interface JsonDisplayProps {
  data: unknown;
}

function JsonDisplay({ data }: JsonDisplayProps) {
  return (
    <div className="rounded-lg border border-border p-3">
      <JsonView
        value={data as object}
        collapsed={1}
        displayDataTypes={false}
        enableClipboard={false}
        shortenTextAfterLength={100}
      />
    </div>
  );
}

/**
 * Tool display component for rendering tool calls, arguments, and results
 */
export function ToolDisplay({ message }: ToolDisplayProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const hasContent = message.args || message.result;

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
          {message.status === 'start' || message.status === 'toolCalling' ? (
            <Skeleton className="px-2 py-0.5 rounded">
              <span className="text-xs">{message.name}</span>
            </Skeleton>
          ) : message.status === 'complete' ? (
            <Badge
              variant="default"
              className="text-xs bg-green-600 hover:bg-green-700 text-white"
            >
              {message.name}
            </Badge>
          ) : message.status === 'error' ? (
            <Badge variant="destructive" className="text-xs">
              {message.name}
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              {message.name}
            </Badge>
          )}
        </div>
      </div>
      {hasContent && (
        <CollapsibleContent className="border border-border rounded-lg p-4 mt-1">
          <div className="flex flex-col gap-2">
            {/* Tool Arguments */}
            {message.args && (
              <div>
                <h5 className="text-xs mb-2">{t('tool.arguments')}</h5>
                <JsonDisplay data={message.args} />
              </div>
            )}

            {/* Tool Result */}
            {message.result && (
              <div>
                <h5 className="text-xs mb-2">{t('tool.result')}</h5>
                <JsonDisplay data={message.result} />
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
