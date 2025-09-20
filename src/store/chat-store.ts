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
  Message,
  StreamChunk,
  ToolCallMessage,
  UserMessage,
} from '@/types/chat';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isMainStreaming: boolean;
  threadId: string;
  resourceId: string;
}

interface ChatActions {
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updateMessage: Message) => void;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  initializeSession: () => void;
}

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

      addMessage: (message: Message) =>
        set(state => ({
          messages: [...state.messages, message],
        })),

      updateMessage: (id: string, updateMessage: Message) =>
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === id ? updateMessage : msg
          ),
        })),

      sendMessage: async (content: string) => {
        const { threadId, resourceId } = get();

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

        try {
          const agent = mastraClient.getAgent('mainAgent');
          let currentTextMessageId: string | null = null;

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

              switch (streamChunk.type) {
                case 'text-start':
                  currentTextMessageId = generateMessageId('assistant');
                  const textMessage: BotMessage = {
                    id: currentTextMessageId,
                    type: 'bot',
                    content: '',
                    timestamp: new Date(),
                    isStreaming: true,
                  };

                  set(state => ({
                    messages: [...state.messages, textMessage],
                    isMainStreaming: false,
                  }));
                  break;

                case 'text-delta':
                  if (streamChunk.payload.text && currentTextMessageId) {
                    const newContent = streamChunk.payload.text;
                    set(state => ({
                      messages: state.messages.map(msg =>
                        msg.id === currentTextMessageId
                          ? {
                              ...msg,
                              content:
                                ('content' in msg ? msg.content : '') +
                                newContent,
                            }
                          : msg
                      ),
                    }));
                  }
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
                  currentTextMessageId = generateMessageId('tool');
                  const toolCallMessage: ToolCallMessage = {
                    id: currentTextMessageId,
                    type: 'tool',
                    name: streamChunk.payload.toolName || 'Unknown Tool Name',
                    timestamp: new Date(),
                    status: 'start',
                  };

                  set(state => ({
                    messages: [...state.messages, toolCallMessage],
                    isMainStreaming: false,
                  }));
                  break;

                case 'tool-call':
                  if (currentTextMessageId) {
                    set(state => ({
                      messages: state.messages.map(msg =>
                        msg.id === currentTextMessageId
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
                  if (currentTextMessageId) {
                    set(state => ({
                      messages: state.messages.map(msg =>
                        msg.id === currentTextMessageId
                          ? {
                              ...msg,
                              result: streamChunk.payload.result,
                              status: 'complete',
                            }
                          : msg
                      ),
                      isMainStreaming: true,
                    }));
                  }
                  currentTextMessageId = null;
                  break;

                case 'finish':
                  set({
                    isMainStreaming: false,
                  });

                default:
                  break;
              }
            },
          });
        } catch {
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
