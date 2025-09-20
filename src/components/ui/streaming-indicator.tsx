import { cn } from '@/lib/utils';

interface StreamingIndicatorProps {
  className?: string;
}

export const StreamingIndicator = ({ className }: StreamingIndicatorProps) => (
  <span
    className={cn(
      'inline-block w-2 h-2 bg-current rounded-full animate-pulse ml-1 align-middle',
      className
    )}
  />
);
