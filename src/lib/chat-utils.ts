/**
 * Generates a unique message ID with role prefix and timestamp
 */
export const generateMessageId = (
  role: 'user' | 'assistant' | 'tool' | 'error' | 'continue'
) => `${role}-${Date.now()}`;

/**
 * Generates a unique thread ID for chat sessions
 */
export const generateThreadId = () =>
  `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Generates a unique resource ID for chat sessions
 */
export const generateResourceId = () =>
  `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
