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

export interface ContinueMessage extends Message {
  type: 'continue';
  content: string;
}

export interface ToolCallMessage extends Message {
  type: 'tool';
  name: string;
  args?: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'start' | 'toolCalling' | 'complete' | 'error';
}

export type MessageTypes =
  | UserMessage
  | BotMessage
  | ContinueMessage
  | ToolCallMessage;

export interface StreamChunk {
  type:
    | 'text-start'
    | 'text-delta'
    | 'text-end'
    | 'tool-call'
    | 'tool-result'
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
 * Type guard to check if a message is a continue message
 */
export const isContinueMessage = (
  message: MessageTypes
): message is ContinueMessage => {
  return message.type === 'continue';
};
