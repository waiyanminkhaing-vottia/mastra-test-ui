import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  generateMessageId,
  generateResourceId,
  generateThreadId,
} from '@/lib/chat-utils';
import { logger } from '@/lib/logger';
import type {
  BotMessage,
  MessageTypes,
  StreamChunk,
  ToolCallMessage,
  UserMessage,
} from '@/types/chat';

interface ChatState {
  messages: MessageTypes[];
  isLoading: boolean;
  isMainStreaming: boolean;
  threadId: string;
  resourceId: string;
  debugMode: boolean;
}

// Helper function to check if tool result has error
const hasToolError = (result: unknown): boolean => {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  return !!(
    r.code === 'TOOL_EXECUTION_FAILED' ||
    (typeof r.message === 'string' && r.message.includes('Error')) ||
    r.error === true ||
    r.isError === true ||
    r.validationErrors
  );
};

interface ChatActions {
  addMessage: (message: MessageTypes) => void;
  updateMessage: (id: string, updateMessage: MessageTypes) => void;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  initializeSession: () => void;
  toggleDebugMode: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Updates a specific message by ID using an updater function
 */
const updateMessageById = (
  messageId: string,
  updater: (msg: MessageTypes) => MessageTypes,
  set: (state: (state: ChatStore) => ChatStore) => void
): void => {
  set(state => ({
    ...state,
    messages: state.messages.map(msg =>
      msg.id === messageId ? updater(msg) : msg
    ),
  }));
};

// =============================================================================
// SMOOTH STREAMING IMPLEMENTATION
// =============================================================================

// Batching system for smooth text streaming
const pendingTextUpdates = new Map<string, string>();
let updateScheduled = false;

/**
 * Flushes all pending text updates to the store
 */
const flushTextUpdates = (
  set: (state: (state: ChatStore) => ChatStore) => void
) => {
  if (pendingTextUpdates.size === 0) return;

  const updates = new Map(pendingTextUpdates);
  pendingTextUpdates.clear();
  updateScheduled = false;

  set(state => ({
    ...state,
    messages: state.messages.map(msg => {
      const pendingText = updates.get(msg.id);
      if (pendingText && 'content' in msg) {
        return {
          ...msg,
          content: msg.content + pendingText,
        };
      }
      return msg;
    }),
  }));
};

// =============================================================================
// STREAM HANDLERS
// =============================================================================

/**
 * Handles the start of a text stream by creating a new bot message
 */
const handleTextStart = (
  _streamChunk: StreamChunk,
  set: (state: (state: ChatStore) => ChatStore) => void
): string => {
  const currentTextMessageId = generateMessageId('assistant');
  const textMessage: BotMessage = {
    id: currentTextMessageId,
    type: 'bot',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
  };

  set(state => ({
    ...state,
    messages: [...state.messages, textMessage],
    isMainStreaming: false,
  }));

  return currentTextMessageId;
};

/**
 * Handles text deltas by batching updates for smooth streaming
 */
const handleTextDelta = (
  streamChunk: StreamChunk,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void
): void => {
  if (streamChunk.payload.text && currentTextMessageId) {
    const newContent = streamChunk.payload.text;

    // Accumulate text for batched updates
    const existing = pendingTextUpdates.get(currentTextMessageId) || '';
    pendingTextUpdates.set(currentTextMessageId, existing + newContent);

    // Schedule update on next animation frame for smooth rendering
    if (!updateScheduled) {
      updateScheduled = true;
      requestAnimationFrame(() => flushTextUpdates(set));
    }
  }
};

/**
 * Handles the end of text streaming
 */
const handleTextEnd = (
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void
): void => {
  if (currentTextMessageId) {
    // Flush any pending text updates immediately
    flushTextUpdates(set);

    // Mark message as no longer streaming
    updateMessageById(
      currentTextMessageId,
      msg => ({ ...msg, isStreaming: false }),
      set
    );
    set(state => ({ ...state, isMainStreaming: true }));
  }
};

// =============================================================================
// TOOL HANDLERS
// =============================================================================

/**
 * Handles the start of a tool call
 */
const handleToolCallStart = (
  streamChunk: StreamChunk,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string => {
  const toolCallId =
    streamChunk.payload.toolCallId ?? generateMessageId('tool');
  const toolCallMessage: ToolCallMessage = {
    id: toolCallId,
    type: 'tool',
    name: streamChunk.payload.toolName || 'Unknown Tool Name',
    timestamp: new Date(),
    status: 'start',
  };

  const currentState = get();
  set(state => ({
    ...state,
    messages: [...state.messages, toolCallMessage],
    // In debug mode, don't change isMainStreaming state for tools
    // In normal mode, keep isMainStreaming true for better UX
    isMainStreaming: currentState.debugMode ? false : true,
  }));

  return toolCallId;
};

/**
 * Handles tool call execution
 */
const handleToolCall = (
  streamChunk: StreamChunk,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void
): void => {
  const toolCallId = streamChunk.payload.toolCallId || currentTextMessageId;
  if (toolCallId) {
    updateMessageById(
      toolCallId,
      msg =>
        ({
          ...msg,
          args: streamChunk.payload.args,
          status: 'toolCalling',
        }) as ToolCallMessage,
      set
    );
  }
};

const handleToolResult = (
  streamChunk: StreamChunk,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string | null => {
  const resultToolCallId: string | null =
    streamChunk.payload.toolCallId || currentTextMessageId;
  if (resultToolCallId) {
    const result = streamChunk.payload.result;
    const hasError = hasToolError(result);
    const _currentState = get();

    set(state => ({
      ...state,
      messages: state.messages.map(msg =>
        msg.id === resultToolCallId
          ? {
              ...msg,
              result: streamChunk.payload.result,
              status: hasError ? 'error' : 'complete',
            }
          : msg
      ),
      // In debug mode, set to true after tool result
      // In normal mode, keep isMainStreaming true
      isMainStreaming: true,
    }));
  }

  // Reset currentTextMessageId only if we used it as fallback
  if (
    !streamChunk.payload.toolCallId &&
    currentTextMessageId === resultToolCallId
  ) {
    return null;
  }
  return currentTextMessageId;
};

// =============================================================================
// STREAM PROCESSING
// =============================================================================

/**
 * Main stream chunk processor that routes to appropriate handlers
 */
const processStreamChunk = (
  streamChunk: StreamChunk,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string | null => {
  switch (streamChunk.type) {
    case 'text-start':
      return handleTextStart(streamChunk, set);

    case 'text-delta':
      handleTextDelta(streamChunk, currentTextMessageId, set);
      return currentTextMessageId;

    case 'text-end':
      handleTextEnd(currentTextMessageId, set);
      return null;

    case 'tool-call-input-streaming-start':
      return handleToolCallStart(streamChunk, set, get);

    case 'tool-call':
      handleToolCall(streamChunk, currentTextMessageId, set);
      return currentTextMessageId;

    case 'tool-result':
      return handleToolResult(streamChunk, currentTextMessageId, set, get);

    case 'finish':
      set(state => ({ ...state, isMainStreaming: false }));
      return currentTextMessageId;

    default:
      return currentTextMessageId;
  }
};

const createInitialMessage = (content: string): UserMessage => {
  return {
    id: generateMessageId('user'),
    type: 'user',
    content,
    timestamp: new Date(),
  };
};

const createErrorMessage = (_error: unknown): BotMessage => {
  return {
    id: generateMessageId('error'),
    type: 'bot',
    content: 'Something went wrong',
    timestamp: new Date(),
    isStreaming: false,
  };
};

type ChatStore = ChatState & ChatActions;
/**
 * Processes a single SSE data line and updates the store state
 */
const processSSEDataLine = (
  data: string,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string | null => {
  if (data === '[DONE]') {
    set(state => ({ ...state, isMainStreaming: false }));
    return currentTextMessageId;
  }

  try {
    const streamChunk = JSON.parse(data) as StreamChunk;
    const updatedMessageId = processStreamChunk(
      streamChunk,
      currentTextMessageId,
      set,
      get
    );

    if (streamChunk.type === 'finish') {
      set(state => ({ ...state, isMainStreaming: false }));
    }

    return updatedMessageId;
  } catch (parseError) {
    // Log the error but don't break the stream - skip malformed chunks
    logger.warn(
      { parseError, data: data.substring(0, 100) },
      'Failed to parse stream chunk, skipping'
    );
    return currentTextMessageId;
  }
};

/**
 * Processes stream lines and updates state accordingly
 */
const processStreamLines = (
  lines: string[],
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): { messageId: string | null; shouldBreak: boolean } => {
  let messageId = currentTextMessageId;

  for (const line of lines) {
    if (line.trim() === '') continue;

    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      messageId = processSSEDataLine(data, messageId, set, get);

      if (data === '[DONE]') {
        return { messageId, shouldBreak: true };
      }
    }
  }

  return { messageId, shouldBreak: false };
};

const processStreamResponse = async (
  response: Response,
  _get: () => ChatStore,
  set: (state: (state: ChatStore) => ChatStore) => void
): Promise<void> => {
  let currentTextMessageId: string | null = null;
  let buffer = ''; // Buffer to accumulate incomplete lines

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body reader available');
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Split on newlines but keep the last incomplete line in buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last (potentially incomplete) line

      const { messageId, shouldBreak } = processStreamLines(
        lines,
        currentTextMessageId,
        set,
        _get
      );

      currentTextMessageId = messageId;
      if (shouldBreak) break;
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      processStreamLines([buffer], currentTextMessageId, set, _get);
    }
  } finally {
    // Ensure reader is properly closed to prevent memory leaks
    try {
      await reader.cancel();
    } catch (error) {
      logger.error({ error }, 'Failed to close stream reader');
    }
  }
};

const makeChatRequest = async (
  content: string,
  threadId: string,
  resourceId: string
): Promise<Response> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content }],
      threadId,
      resourceId,
      agentId: 'mainAgent',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body received');
  }

  return response;
};

/**
 * Zustand store for managing chat state and actions
 */
export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      messages: [],
      isLoading: false,
      isMainStreaming: false,
      threadId: '',
      resourceId: '',
      debugMode: false,

      addMessage: (message: MessageTypes) =>
        set(state => ({
          messages: [...state.messages, message],
        })),

      updateMessage: (id: string, updateMessage: MessageTypes) =>
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === id ? updateMessage : msg
          ),
        })),

      sendMessage: async (content: string) => {
        const { threadId, resourceId } = get();

        // Add initial message
        const initialMessage = createInitialMessage(content);
        set(state => ({
          messages: [...state.messages, initialMessage],
          isLoading: true,
          isMainStreaming: true,
        }));

        try {
          const response = await makeChatRequest(content, threadId, resourceId);
          await processStreamResponse(response, get, set);
        } catch (error) {
          logger.error({ error }, 'Chat streaming error');
          const errorMessage = createErrorMessage(error);
          set(state => ({
            ...state,
            messages: [...state.messages, errorMessage],
            isMainStreaming: false,
          }));
        } finally {
          set(state => ({
            ...state,
            isLoading: false,
            isMainStreaming: false,
          }));
        }
      },

      stopGeneration: () => set({ isLoading: false, isMainStreaming: false }),

      clearMessages: () => set({ messages: [] }),

      initializeSession: () =>
        set({
          threadId: generateThreadId(),
          resourceId: generateResourceId(),
        }),

      toggleDebugMode: () => set(state => ({ debugMode: !state.debugMode })),
    }),
    {
      name: 'chat-store',
    }
  )
);
