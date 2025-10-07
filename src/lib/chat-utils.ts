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
  role: 'user' | 'assistant' | 'tool' | 'error' | 'routing' | 'restream'
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

  // Special cases - tools that should show as "thinking" instead of action
  const thinkingTools = [
    'updateworkingmemory',
    'workingmemory',
    'get_current_time',
  ];
  if (thinkingTools.some(tool => normalized.includes(tool))) {
    return 'thinking';
  }

  // Common action keywords to look for (in order of priority)
  // Multi-word keywords first to avoid partial matches
  const actionKeywords = [
    'lookup',
    'generate',
    'upload',
    'download',
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
  // Check for whole word matches with underscores
  for (const keyword of actionKeywords) {
    // Match if keyword appears:
    // - At start: lookup_customer
    // - After underscore: customer_lookup
    // - As whole word between underscores: get_customer_data
    const regex = new RegExp(`(?:^|_)${keyword}(?:_|$)`, 'i');

    if (regex.test(normalized)) {
      return keyword;
    }
  }

  // If no keyword found, return 'default'
  return 'default';
};
