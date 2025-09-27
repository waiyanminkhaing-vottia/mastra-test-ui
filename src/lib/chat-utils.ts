/**
 * Generates a unique message ID with role prefix using crypto.randomUUID
 */
export const generateMessageId = (
  role: 'user' | 'assistant' | 'tool' | 'error' | 'continue'
) => `${role}-${crypto.randomUUID()}`;

/**
 * Generates a unique thread ID for chat sessions
 */
export const generateThreadId = () => `thread-${crypto.randomUUID()}`;

/**
 * Generates a unique resource ID for chat sessions
 */
export const generateResourceId = () => `resource-${crypto.randomUUID()}`;
