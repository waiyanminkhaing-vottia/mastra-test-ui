import { MastraClient } from '@mastra/client-js';

// Validate environment variable at startup
const url = process.env.NEXT_PUBLIC_MASTRA_SERVER_URL;
if (!url) {
  throw new Error(
    'NEXT_PUBLIC_MASTRA_SERVER_URL environment variable is required'
  );
}

/**
 * Mastra client instance configured with server URL from environment variables.
 */
export const mastraClient = new MastraClient({
  baseUrl: url,
});
