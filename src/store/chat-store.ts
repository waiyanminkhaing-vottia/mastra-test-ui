import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { withBasePath } from '@/lib/base-path';
import {
  generateMessageId,
  generateResourceId,
  generateThreadId,
} from '@/lib/chat-utils';
import { logger } from '@/lib/logger';
import type {
  BotMessage,
  ErrorMessage,
  MessageTypes,
  RoutingMessage,
  StreamChunk,
  ToolCallMessage,
  UserMessage,
} from '@/types/chat';

interface ChatState {
  messages: MessageTypes[];
  isLoading: boolean;
  isMainStreaming: boolean;
  currentToolName: string | null;
  threadId: string;
  resourceId: string;
  debugMode: boolean;
  abortController: AbortController | null;
}

interface ChatActions {
  addMessage: (message: MessageTypes) => void;
  updateMessage: (id: string, updateMessage: MessageTypes) => void;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  initializeSession: () => void;
  toggleDebugMode: () => void;
}

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

/**
 * Batches text updates to reduce re-renders during streaming.
 * Uses a WeakMap-like approach through the store to prevent memory leaks.
 */
class TextUpdateBatcher {
  private updates = new Map<string, string>();
  private scheduled = false;

  add(messageId: string, text: string): void {
    const existing = this.updates.get(messageId) || '';
    this.updates.set(messageId, existing + text);
  }

  scheduleFlush(set: (state: (state: ChatStore) => ChatStore) => void): void {
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush(set));
    }
  }

  flush(set: (state: (state: ChatStore) => ChatStore) => void): void {
    if (this.updates.size === 0) return;

    const updates = new Map(this.updates);
    this.clear();

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
  }

  clear(): void {
    this.updates.clear();
    this.scheduled = false;
  }
}

const textUpdateBatcher = new TextUpdateBatcher();

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

const handleTextDelta = (
  streamChunk: StreamChunk,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void
): void => {
  if (streamChunk.payload.text && currentTextMessageId) {
    textUpdateBatcher.add(currentTextMessageId, streamChunk.payload.text);
    textUpdateBatcher.scheduleFlush(set);
  }
};

const handleTextEnd = (
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void
): void => {
  if (currentTextMessageId) {
    textUpdateBatcher.flush(set);
    updateMessageById(
      currentTextMessageId,
      msg => ({ ...msg, isStreaming: false }),
      set
    );
    set(state => ({ ...state, isMainStreaming: true }));
  }
};

const handleToolCallStart = (
  streamChunk: StreamChunk,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string => {
  const toolCallId =
    streamChunk.payload.toolCallId ?? generateMessageId('tool');
  const toolName = streamChunk.payload.toolName || 'Unknown Tool Name';
  const toolCallMessage: ToolCallMessage = {
    id: toolCallId,
    type: 'tool',
    name: toolName,
    timestamp: new Date(),
    status: 'start',
  };

  const currentState = get();
  set(state => ({
    ...state,
    messages: [...state.messages, toolCallMessage],
    isMainStreaming: currentState.debugMode ? false : true,
    currentToolName: currentState.debugMode ? null : toolName,
  }));

  return toolCallId;
};

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
  _get: () => ChatStore
): string | null => {
  const resultToolCallId: string | null =
    streamChunk.payload.toolCallId || currentTextMessageId;
  if (resultToolCallId) {
    const result = streamChunk.payload.result;
    const hasError = hasToolError(result);

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
      isMainStreaming: true,
      currentToolName: null,
    }));
  }

  if (
    !streamChunk.payload.toolCallId &&
    currentTextMessageId === resultToolCallId
  ) {
    return null;
  }
  return currentTextMessageId;
};

const handleRoutingStart = (
  streamChunk: StreamChunk,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string | null => {
  const inputData = streamChunk.payload.inputData as
    | Record<string, unknown>
    | undefined;
  const primitiveIdFromInput = inputData?.primitiveId as string | undefined;

  const routingMessageId = generateMessageId('routing');
  const routingMessage: RoutingMessage = {
    id: routingMessageId,
    type: 'routing',
    timestamp: new Date(),
    isStreaming: true,
    start: primitiveIdFromInput || 'Start',
    end: '',
  };

  const currentState = get();
  set(state => ({
    ...state,
    isMainStreaming: currentState.debugMode ? false : true,
    messages: [...state.messages, routingMessage],
  }));

  return routingMessageId;
};

const handleRoutingEnd = (
  streamChunk: StreamChunk,
  currentRoutingMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void
): void => {
  const primitiveId = streamChunk.payload.primitiveId as string | undefined;
  const selectionReason = streamChunk.payload.selectionReason as
    | string
    | undefined;
  const prompt = streamChunk.payload.prompt as string | undefined;

  if (currentRoutingMessageId) {
    updateMessageById(
      currentRoutingMessageId,
      msg =>
        ({
          ...msg,
          end: primitiveId || 'Finish',
          selectionReason,
          prompt,
          isStreaming: false,
        }) as RoutingMessage,
      set
    );
    set(state => ({
      ...state,
      isMainStreaming: true,
    }));
  }
};

/**
 * Processes a single stream chunk and updates the appropriate message.
 * Routes the chunk to the correct handler based on its type.
 *
 * @param streamChunk - The parsed stream chunk from the SSE response
 * @param currentTextMessageId - ID of the current text message being built
 * @param set - Zustand state setter function
 * @param get - Zustand state getter function
 * @returns Updated message ID or null if the message sequence is complete
 */
const processStreamChunk = (
  streamChunk: StreamChunk,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string | null => {
  switch (streamChunk.type) {
    case 'routing-start':
      return handleRoutingStart(streamChunk, set, get);

    case 'routing-end':
      handleRoutingEnd(streamChunk, currentTextMessageId, set);
      return null;

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
      set(state => ({
        ...state,
        isMainStreaming: false,
        currentToolName: null,
      }));
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

const createErrorMessage = (error: unknown): ErrorMessage => {
  // Extract error message for logging while showing generic message to user
  const errorDetails = error instanceof Error ? error.message : String(error);
  logger.error({ error, errorDetails }, 'Creating error message');

  return {
    id: generateMessageId('error'),
    type: 'error',
    content: 'Something went wrong',
    timestamp: new Date(),
    errorCode: error instanceof Error ? error.name : undefined,
  };
};

type ChatStore = ChatState & ChatActions;

const processSSEDataLine = (
  data: string,
  currentTextMessageId: string | null,
  set: (state: (state: ChatStore) => ChatStore) => void,
  get: () => ChatStore
): string | null => {
  if (data === '[DONE]') {
    set(state => ({ ...state, isMainStreaming: false, currentToolName: null }));
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
    logger.warn(
      { parseError, data: data.substring(0, 100) },
      'Failed to parse stream chunk, skipping'
    );
    return currentTextMessageId;
  }
};

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

/**
 * Processes the SSE stream response from the chat API.
 * Handles incomplete lines, parses chunks, and updates the chat state.
 *
 * @param response - The fetch Response object containing the SSE stream
 * @param _get - Zustand state getter function (prefixed with _ as it's passed to handlers)
 * @param set - Zustand state setter function
 * @throws Error if no response body reader is available
 */
const processStreamResponse = async (
  response: Response,
  _get: () => ChatStore,
  set: (state: (state: ChatStore) => ChatStore) => void
): Promise<void> => {
  let currentTextMessageId: string | null = null;
  let buffer = '';

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
  resourceId: string,
  signal?: AbortSignal
): Promise<Response> => {
  const response = await fetch(withBasePath('/api/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content }],
      threadId,
      resourceId,
    }),
    signal,
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
      currentToolName: null,
      threadId: '',
      resourceId: '',
      debugMode: false,
      abortController: null,

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
        const { threadId, resourceId, abortController: oldController } = get();

        // Abort any existing request
        if (oldController) {
          oldController.abort();
        }

        // Create new AbortController for this request
        const controller = new AbortController();

        // Add initial message
        const initialMessage = createInitialMessage(content);
        set(state => ({
          messages: [...state.messages, initialMessage],
          isLoading: true,
          isMainStreaming: true,
          abortController: controller,
        }));

        try {
          const response = await makeChatRequest(
            content,
            threadId,
            resourceId,
            controller.signal
          );
          await processStreamResponse(response, get, set);
        } catch (error) {
          // Don't show error if request was aborted by user
          if (error instanceof Error && error.name === 'AbortError') {
            logger.info('Chat request aborted by user');
          } else {
            logger.error({ error }, 'Chat streaming error');
            const errorMessage = createErrorMessage(error);
            set(state => ({
              ...state,
              messages: [...state.messages, errorMessage],
              isMainStreaming: false,
            }));
          }
        } finally {
          set(state => ({
            ...state,
            isLoading: false,
            isMainStreaming: false,
            abortController: null,
          }));
        }
      },

      stopGeneration: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
        }
        set({
          isLoading: false,
          isMainStreaming: false,
          currentToolName: null,
          abortController: null,
        });
      },

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
