import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  generateMessageId,
  generateResourceId,
  generateThreadId,
} from '@/lib/chat-utils';
import { mastraClient } from '@/lib/mastra-client';
import type {
  BotMessage,
  ContinueMessage,
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
  sendMessage: (content: string, isRetry?: boolean) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  initializeSession: () => void;
}

// Handler functions to reduce complexity
const handleTextStart = (
  streamChunk: StreamChunk,
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
    const newContent = streamChunk.payload.text;
    set(state => ({
      ...state,
      messages: state.messages.map(msg =>
        msg.id === currentTextMessageId
          ? {
              ...msg,
              content: ('content' in msg ? msg.content : '') + newContent,
            }
          : msg
      ),
    }));
  }
};

const handleToolCallStart = (
  streamChunk: StreamChunk,
  set: (state: (state: ChatStore) => ChatStore) => void
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

  set(state => ({
    ...state,
    messages: [...state.messages, toolCallMessage],
    isMainStreaming: false,
  }));

  return toolCallId;
};

type ChatStore = ChatState & ChatActions;

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

      sendMessage: async (content: string, isRetry: boolean = false) => {
        const { threadId, resourceId } = get();

        // Add appropriate message type based on retry status
        if (!isRetry) {
          const userMessage: UserMessage = {
            id: generateMessageId('user'),
            type: 'user',
            content,
            timestamp: new Date(),
          };

          set(state => ({
            messages: [...state.messages, userMessage],
            isLoading: true,
            isMainStreaming: true,
          }));
        } else {
          const continueMessage: ContinueMessage = {
            id: generateMessageId('continue'),
            type: 'continue',
            content: '続けて',
            timestamp: new Date(),
          };

          set(state => ({
            messages: [...state.messages, continueMessage],
            isLoading: true,
            isMainStreaming: true,
          }));
        }

        let finishTimeout: NodeJS.Timeout | null = null;

        try {
          const agent = mastraClient.getAgent('mainAgent');
          let currentTextMessageId: string | null = null;
          let hasFinishEvent = false;
          let lastEventType: string | null = null;
          let secondLastEventType: string | null = null;

          const response = await agent.streamVNext({
            messages: [{ role: 'user', content }],
            memory: {
              thread: threadId,
              resource: resourceId,
            },
          });

          await response.processDataStream({
            onChunk: async (chunk: unknown) => {
              const streamChunk = chunk as StreamChunk;

              // Track the last two event types
              secondLastEventType = lastEventType;
              lastEventType = streamChunk.type;

              // Clear any existing timeout
              if (finishTimeout) {
                clearTimeout(finishTimeout);
                finishTimeout = null;
              }

              // If this is a step-finish event, set timeout to wait for step-start
              if (streamChunk.type === 'step-finish') {
                finishTimeout = setTimeout(() => {
                  if (
                    lastEventType === 'step-finish' &&
                    secondLastEventType === 'tool-result' &&
                    !hasFinishEvent
                  ) {
                    // Retry with continue text
                    get().sendMessage('続けて', true);
                  }
                }, 2000); // 3 second timeout after step-finish
              }

              switch (streamChunk.type) {
                case 'text-start':
                  currentTextMessageId = handleTextStart(streamChunk, set);
                  break;

                case 'text-delta':
                  handleTextDelta(streamChunk, currentTextMessageId, set);
                  break;

                case 'text-end':
                  if (currentTextMessageId) {
                    set(state => ({
                      messages: state.messages.map(msg =>
                        msg.id === currentTextMessageId
                          ? {
                              ...msg,
                              isStreaming: false,
                            }
                          : msg
                      ),
                      isMainStreaming: true,
                    }));
                  }
                  currentTextMessageId = null;
                  break;

                case 'tool-call-input-streaming-start':
                  currentTextMessageId = handleToolCallStart(streamChunk, set);
                  break;

                case 'tool-call':
                  const toolCallId =
                    streamChunk.payload.toolCallId || currentTextMessageId;
                  if (toolCallId) {
                    set(state => ({
                      messages: state.messages.map(msg =>
                        msg.id === toolCallId
                          ? {
                              ...msg,
                              args: streamChunk.payload.args,
                              status: 'toolCalling',
                            }
                          : msg
                      ),
                    }));
                  }
                  break;

                case 'tool-result':
                  const resultToolCallId =
                    streamChunk.payload.toolCallId || currentTextMessageId;
                  if (resultToolCallId) {
                    const result = streamChunk.payload.result;
                    const hasError = hasToolError(result);

                    set(state => ({
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
                    }));
                  }
                  // Reset currentTextMessageId only if we used it as fallback
                  if (
                    !streamChunk.payload.toolCallId &&
                    currentTextMessageId === resultToolCallId
                  ) {
                    currentTextMessageId = null;
                  }
                  break;

                case 'finish':
                  hasFinishEvent = true;
                  if (finishTimeout) {
                    clearTimeout(finishTimeout);
                    finishTimeout = null;
                  }
                  set({
                    isMainStreaming: false,
                  });

                default:
                  break;
              }
            },
          });
        } catch {
          // Clean up timeout on error
          if (finishTimeout) {
            clearTimeout(finishTimeout);
            finishTimeout = null;
          }

          const errorMessage: BotMessage = {
            id: generateMessageId('error'),
            type: 'bot',
            content:
              'Sorry, I encountered an error. Please make sure the Mastra server is running.',
            timestamp: new Date(),
            isStreaming: false,
          };

          set(state => ({
            messages: [...state.messages, errorMessage],
            isMainStreaming: false,
          }));
        } finally {
          set({ isLoading: false, isMainStreaming: false });
        }
      },

      stopGeneration: () => set({ isLoading: false, isMainStreaming: false }),

      clearMessages: () => set({ messages: [] }),

      initializeSession: () =>
        set({
          threadId: generateThreadId(),
          resourceId: generateResourceId(),
        }),
    }),
    {
      name: 'chat-store',
    }
  )
);
