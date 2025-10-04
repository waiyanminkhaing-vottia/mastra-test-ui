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

function mapNetworkEventToClientEvent(chunk: unknown): unknown | null {
  if (!chunk || typeof chunk !== 'object') return null;

  const event = chunk as {
    type: string;
    payload?: {
      type?: string;
      payload?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };

  if (!event.payload) return null;

  switch (event.type) {
    case 'routing-agent-start':
      return { type: 'routing-start', payload: event.payload };

    case 'routing-agent-end':
      return { type: 'routing-end', payload: event.payload };

    case 'agent-execution-start':
      return { type: 'agent-start', payload: event.payload };

    case 'agent-execution-end':
      return { type: 'agent-end', payload: event.payload };

    case 'agent-execution-event-text-start':
      return event.payload.payload
        ? { type: 'text-start', payload: event.payload.payload }
        : null;

    case 'agent-execution-event-text-delta':
      return event.payload.payload
        ? { type: 'text-delta', payload: event.payload.payload }
        : null;

    case 'agent-execution-event-text-end':
      return event.payload.payload
        ? { type: 'text-end', payload: event.payload.payload }
        : null;

    case 'agent-execution-event-tool-call-input-streaming-start':
      return event.payload.payload
        ? {
            type: 'tool-call-input-streaming-start',
            payload: event.payload.payload,
          }
        : null;

    case 'agent-execution-event-tool-call':
      return event.payload.payload
        ? { type: 'tool-call', payload: event.payload.payload }
        : null;

    case 'agent-execution-event-tool-result':
      return event.payload.payload
        ? { type: 'tool-result', payload: event.payload.payload }
        : null;

    case 'network-execution-event-step-finish':
      return { type: 'finish', payload: event.payload };

    default:
      return null;
  }
}

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
            const clientEvent = mapNetworkEventToClientEvent(chunk);

            if (clientEvent) {
              const data = `data: ${JSON.stringify(clientEvent)}\n\n`;
              controller.enqueue(new TextEncoder().encode(data));
            }
          },
        });

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

const isNetworkError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error.message.includes('fetch') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ERR_NETWORK') ||
      error.name === 'TypeError')
  );
};

const handleNetworkError = (error: unknown) => {
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
};

const handleValidationError = (error: z.ZodError) => {
  const firstError = error.errors[0];
  return corsJsonResponse(
    {
      error: 'Validation failed',
      message: firstError.message,
      path: firstError.path.join('.'),
    },
    { status: 400 }
  );
};

const handleGenericError = (error: unknown) => {
  logger.error(
    {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    },
    'Chat API error'
  );

  return corsJsonResponse(
    {
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
};

/**
 * Handles CORS preflight OPTIONS requests
 */
export async function OPTIONS() {
  return handleCORSPreflight();
}

/**
 * Handles POST requests to stream chat responses from Mastra agents
 */
export async function POST(request: NextRequest) {
  if (!isOriginAllowed(request)) {
    return corsJsonResponse({ error: 'Origin not allowed' }, { status: 403 });
  }

  try {
    validateRequestSize(request.headers);

    const rawBody = await request.json();
    const { messages, threadId, resourceId } = validateChatRequest(rawBody);

    const agentId = process.env.MAIN_AGENT_NAME;
    if (!agentId) {
      throw new Error('MAIN_AGENT_NAME environment variable is not set');
    }

    const agent = mastraClient.getAgent(agentId);

    const response = await agent.network({
      messages: messages as unknown as Parameters<
        typeof agent.network
      >[0]['messages'],
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
    if (isNetworkError(error)) {
      return handleNetworkError(error);
    }

    if (error instanceof z.ZodError) {
      return handleValidationError(error);
    }

    return handleGenericError(error);
  }
}

/**
 * Handles GET requests to check API status
 */
export async function GET() {
  return corsJsonResponse({ message: 'Chat API is running' }, { status: 200 });
}
