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
  role: 'user' | 'assistant' | 'tool' | 'error' | 'routing'
) => `${role}-${generateUniqueId()}`;

/**
 * Generates a unique thread ID for chat sessions
 */
export const generateThreadId = () => `thread-${generateUniqueId()}`;

/**
 * Generates a unique resource ID for chat sessions
 */
export const generateResourceId = () => `resource-${generateUniqueId()}`;

/**
 * Extracts action keyword from tool name
 * Examples:
 * - zapier_get_spreadsheet -> "get"
 * - create_user -> "create"
 * - fetchData -> "fetch"
 * - updateRecord -> "update"
 */
export const extractToolAction = (toolName: string): string => {
  // Convert to lowercase
  const normalized = toolName.toLowerCase();

  // Common action keywords to look for (in order of priority)
  const actionKeywords = [
    'get',
    'fetch',
    'retrieve',
    'search',
    'find',
    'list',
    'read',
    'create',
    'add',
    'insert',
    'update',
    'edit',
    'modify',
    'delete',
    'remove',
    'send',
    'post',
    'put',
    'upload',
    'download',
    'execute',
    'run',
    'process',
    'calculate',
    'compute',
    'analyze',
    'validate',
    'check',
    'verify',
  ];

  // Try to find action keyword in the tool name
  for (const keyword of actionKeywords) {
    if (normalized.includes(keyword)) {
      return keyword;
    }
  }

  // If no keyword found, return 'default'
  return 'default';
};
