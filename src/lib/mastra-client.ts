import { MastraClient } from '@mastra/client-js';

// Validate environment variable at startup
const url = process.env.MASTRA_SERVER_URL;
if (!url) {
  throw new Error('MASTRA_SERVER_URL environment variable is required');
}

/**
 * Mastra client instance configured with server URL from environment variables.
 */
export const mastraClient = new MastraClient({
  baseUrl: url,
  retries: 3,
  backoffMs: 300,
  maxBackoffMs: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});
