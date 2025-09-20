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
  args?: JSON;
  result?: JSON;
  status: 'start' | 'toolCalling' | 'complete' | 'error';
}

export interface StreamChunk {
  type: string;
  payload: {
    text?: string;
    toolName?: string;
    args?: JSON;
    result?: JSON;
  };
}
