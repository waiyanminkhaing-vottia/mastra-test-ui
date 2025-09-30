/**
 * Generates a unique ID using timestamp and random number
 */
const generateUniqueId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Generates a unique message ID with role prefix
 */
export const generateMessageId = (
  role: 'user' | 'assistant' | 'tool' | 'error' | 'continue'
) => `${role}-${generateUniqueId()}`;

/**
 * Generates a unique thread ID for chat sessions
 */
export const generateThreadId = () => `thread-${generateUniqueId()}`;

/**
 * Generates a unique resource ID for chat sessions
 */
export const generateResourceId = () => `resource-${generateUniqueId()}`;
