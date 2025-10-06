export interface Message {
  id: string;
  timestamp: Date;
}

export interface UserMessage extends Message {
  type: 'user';
  content: string;
}

export interface BotMessage extends Message {
  type: 'bot';
  content: string;
  isStreaming: boolean;
}

export interface ToolCallMessage extends Message {
  type: 'tool';
  name: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'start' | 'toolCalling' | 'complete' | 'error';
}

export interface RoutingMessage extends Message {
  type: 'routing';
  isStreaming: boolean;
  start: string;
  end: string;
  selectionReason?: string;
  prompt?: string;
}

export interface ErrorMessage extends Message {
  type: 'error';
  content: string;
  errorCode?: string;
  originalContent?: string; // Store the original user message that failed
  isRetried?: boolean; // Flag to show retried badge instead of button
}

export interface RestreamMessage extends Message {
  type: 'restream';
  lastEventType: string | null;
  previousLastEventType: string | null;
  retryCount: number;
}

export type MessageTypes =
  | UserMessage
  | BotMessage
  | ToolCallMessage
  | RoutingMessage
  | ErrorMessage
  | RestreamMessage;

export interface StreamChunk {
  type:
    | 'text-start'
    | 'text-delta'
    | 'text-end'
    | 'tool-call'
    | 'tool-result'
    | 'routing-start'
    | 'routing-end'
    | 'agent-start'
    | 'agent-end'
    | 'finish'
    | 'error'
    | string;
  payload: {
    text?: string;
    toolName?: string;
    toolCallId?: string;
    args?: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
    agentId?: string;
    primitiveId?: string;
    selectionReason?: string;
    [key: string]: unknown;
  };
}

// Type guard functions for better type safety
/**
 * Type guard to check if a message is a user message
 */
export const isUserMessage = (
  message: MessageTypes
): message is UserMessage => {
  return message.type === 'user';
};

/**
 * Type guard to check if a message is a bot message
 */
export const isBotMessage = (message: MessageTypes): message is BotMessage => {
  return message.type === 'bot';
};

/**
 * Type guard to check if a message is a tool call message
 */
export const isToolCallMessage = (
  message: MessageTypes
): message is ToolCallMessage => {
  return message.type === 'tool';
};

/**
 * Type guard to check if a message is a routing message
 */
export const isRoutingMessage = (
  message: MessageTypes
): message is RoutingMessage => {
  return message.type === 'routing';
};

/**
 * Type guard to check if a message is an error message
 */
export const isErrorMessage = (
  message: MessageTypes
): message is ErrorMessage => {
  return message.type === 'error';
};
