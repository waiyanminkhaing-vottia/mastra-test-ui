import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  corsJsonResponse,
  handleCORSPreflight,
  isOriginAllowed,
} from '@/lib/cors';
import { logger } from '@/lib/logger';
import { mastraClient } from '@/lib/mastra-client';
import { validateChatRequest, validateRequestSize } from '@/lib/validation';

/**
 * Creates a streaming response from the Mastra agent
 */
function createStreamingResponse(
  agentResponse: {
    processDataStream: (options: {
      onChunk: (chunk: unknown) => Promise<void>;
    }) => Promise<void>;
  },
  agentId: string,
  threadId?: string
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await agentResponse.processDataStream({
          onChunk: async (chunk: unknown) => {
            // Validate chunk data before processing
            if (chunk && typeof chunk === 'object') {
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
          },
        });

        // Send done signal
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        logger.error({ error, agentId, threadId }, 'Stream processing error');

        const errorMessage =
          error instanceof Error ? error.message : 'Stream processing failed';

        const errorData = `data: ${JSON.stringify({
          type: 'error',
          payload: { error: errorMessage },
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Handles OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return handleCORSPreflight();
}

/**
 * Handles POST requests to stream chat responses from Mastra agents
 */
export async function POST(request: NextRequest) {
  // Check CORS origin
  if (!isOriginAllowed(request)) {
    return corsJsonResponse({ error: 'Origin not allowed' }, { status: 403 });
  }

  try {
    // Validate request size
    validateRequestSize(request.headers);

    // Parse and validate request body
    const rawBody = await request.json();
    const { messages, threadId, resourceId, agentId } =
      validateChatRequest(rawBody);

    const agent = mastraClient.getAgent(agentId);

    // Use streamVNext with correct signature - messages first, options second
    const response = await agent.streamVNext(messages as never, {
      memory:
        threadId && resourceId
          ? {
              thread: threadId,
              resource: resourceId,
            }
          : undefined,
    });

    return createStreamingResponse(
      response as {
        processDataStream: (options: {
          onChunk: (chunk: unknown) => Promise<void>;
        }) => Promise<void>;
      },
      agentId,
      threadId
    );
  } catch (error) {
    // Handle network/connection errors to Mastra server
    if (
      error instanceof Error &&
      (error.message.includes('fetch') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ERR_NETWORK') ||
        error.name === 'TypeError')
    ) {
      logger.error(
        { error, mastraUrl: process.env.MASTRA_SERVER_URL },
        'Mastra server connection failed'
      );
      return corsJsonResponse(
        {
          error: 'Mastra server connection failed',
          message:
            'Unable to connect to the Mastra AI server. Please ensure the server is running.',
          details: `Server URL: ${process.env.MASTRA_SERVER_URL}`,
        },
        { status: 503 }
      );
    }
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return corsJsonResponse(
        {
          error: 'Validation failed',
          message: firstError.message,
          path: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Chat API error');

    return corsJsonResponse(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handles GET requests to check chat API status
 */
export async function GET() {
  return corsJsonResponse({ message: 'Chat API is running' }, { status: 200 });
}
