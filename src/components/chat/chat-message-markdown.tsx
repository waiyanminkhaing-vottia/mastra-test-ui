import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { StreamingIndicator } from '@/components/ui/streaming-indicator';

interface ChatMessageMarkdownProps {
  children: string;
  className?: string;
  isStreaming?: boolean;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 last:inline">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 last:mb-0 list-disc pl-4">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 last:mb-0 list-decimal pl-4">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ children, className }) => {
    const isInline = !className?.includes('language-');
    return isInline ? (
      <code className="bg-muted px-1 py-0.5 rounded text-sm text-foreground">
        {children}
      </code>
    ) : (
      <code className={className}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2 text-foreground">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border pl-4 my-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mb-2 text-foreground">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold mb-2 text-foreground">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-bold mb-2 text-foreground">{children}</h3>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="border-collapse border border-border">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1 bg-muted font-semibold text-left">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
};

/**
 * Renders markdown content with streaming indicator support
 */
export function ChatMessageMarkdown({
  children,
  className,
  isStreaming,
}: ChatMessageMarkdownProps) {
  // Helper function to handle streaming indicator in any element
  const STREAMING_PLACEHOLDER = '[STREAMING]';
  const handleStreamingInChildren = (
    children: React.ReactNode
  ): React.ReactNode => {
    // Handle arrays of children (common in markdown processing)
    if (Array.isArray(children)) {
      return children.map((child, _childIndex) => {
        if (
          typeof child === 'string' &&
          child.includes(STREAMING_PLACEHOLDER)
        ) {
          const parts = child.split(STREAMING_PLACEHOLDER);
          return (
            <React.Fragment
              key={`streaming-${parts[0].slice(0, 10)}-${Date.now()}`}
            >
              {parts[0]}
              <StreamingIndicator />
              {parts[1]}
            </React.Fragment>
          );
        }
        return child;
      });
    }

    // Handle single string children
    if (
      typeof children === 'string' &&
      children.includes(STREAMING_PLACEHOLDER)
    ) {
      const parts = children.split(STREAMING_PLACEHOLDER);
      return (
        <>
          {parts[0]}
          <StreamingIndicator />
          {parts[1]}
        </>
      );
    }
    return children;
  };

  const componentsWithStreaming: Components = {
    ...markdownComponents,
    p: ({ children: pChildren, ...props }) => (
      <p className="mb-2 last:mb-0" {...props}>
        {handleStreamingInChildren(pChildren)}
      </p>
    ),
    ul: ({ children: ulChildren, ...props }) => (
      <ul className="mb-2 last:mb-0 list-disc pl-4" {...props}>
        {handleStreamingInChildren(ulChildren)}
      </ul>
    ),
    ol: ({ children: olChildren, ...props }) => (
      <ol className="mb-2 last:mb-0 list-decimal pl-4" {...props}>
        {handleStreamingInChildren(olChildren)}
      </ol>
    ),
    li: ({ children: liChildren, ...props }) => (
      <li className="mb-1" {...props}>
        {handleStreamingInChildren(liChildren)}
      </li>
    ),
    h1: ({ children: h1Children, ...props }) => (
      <h1 className="text-xl font-bold mb-2 text-foreground" {...props}>
        {handleStreamingInChildren(h1Children)}
      </h1>
    ),
    h2: ({ children: h2Children, ...props }) => (
      <h2 className="text-lg font-bold mb-2 text-foreground" {...props}>
        {handleStreamingInChildren(h2Children)}
      </h2>
    ),
    h3: ({ children: h3Children, ...props }) => (
      <h3 className="text-base font-bold mb-2 text-foreground" {...props}>
        {handleStreamingInChildren(h3Children)}
      </h3>
    ),
    blockquote: ({ children: bqChildren, ...props }) => (
      <blockquote
        className="border-l-4 border-border pl-4 my-2 text-muted-foreground"
        {...props}
      >
        {handleStreamingInChildren(bqChildren)}
      </blockquote>
    ),
    code: ({ children: codeChildren, className, ...props }) => {
      const isInline = !className?.includes('language-');
      return isInline ? (
        <code
          className="bg-muted px-1 py-0.5 rounded text-sm text-foreground"
          {...props}
        >
          {handleStreamingInChildren(codeChildren)}
        </code>
      ) : (
        <code className={className} {...props}>
          {handleStreamingInChildren(codeChildren)}
        </code>
      );
    },
  };

  const contentWithStreaming = isStreaming
    ? `${children} ${STREAMING_PLACEHOLDER}`
    : children;

  return (
    <div className={className}>
      <ReactMarkdown
        components={componentsWithStreaming}
        remarkPlugins={[remarkGfm, remarkBreaks]}
        skipHtml={false}
      >
        {contentWithStreaming}
      </ReactMarkdown>
    </div>
  );
}
