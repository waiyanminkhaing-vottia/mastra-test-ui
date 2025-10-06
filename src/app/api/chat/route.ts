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

// Helper to create event with nested payload
const createNestedPayloadEvent = (
  type: string,
  payload?: Record<string, unknown>
) => (payload ? { type, payload } : null);

function mapNetworkEventToClientEvent(chunk: unknown): unknown | null {
  const event = chunk as {
    type: string;
    payload?: {
      type?: string;
      payload?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };

  if (!event.payload) return null;

  // Direct payload mapping
  const directPayloadEvents: Record<string, string> = {
    'routing-agent-start': 'routing-start',
    'routing-agent-end': 'routing-end',
    'agent-execution-start': 'agent-start',
    'agent-execution-end': 'agent-end',
    'network-execution-event-step-finish': 'finish',
  };

  if (directPayloadEvents[event.type]) {
    return { type: directPayloadEvents[event.type], payload: event.payload };
  }

  // Nested payload mapping
  const nestedPayloadEvents: Record<string, string> = {
    'agent-execution-event-text-start': 'text-start',
    'agent-execution-event-text-delta': 'text-delta',
    'agent-execution-event-text-end': 'text-end',
    'agent-execution-event-tool-call-input-streaming-start':
      'tool-call-input-streaming-start',
    'agent-execution-event-tool-call': 'tool-call',
    'agent-execution-event-tool-result': 'tool-result',
  };

  if (nestedPayloadEvents[event.type]) {
    return createNestedPayloadEvent(
      nestedPayloadEvents[event.type],
      event.payload.payload
    );
  }

  // Error events
  if (
    event.type === 'agent-execution-event-error' ||
    event.type === 'network-execution-event-error'
  ) {
    return event.payload.payload
      ? { type: 'error', payload: event.payload.payload }
      : { type: 'error', payload: event.payload };
  }

  return null;
}

async function streamAgentResponse(
  agent: ReturnType<typeof mastraClient.getAgent>,
  messages: unknown[],
  threadId: string | undefined,
  resourceId: string | undefined,
  controller: ReadableStreamDefaultController,
  useNetworkMapper: boolean
): Promise<void> {
  const maxRetries = parseInt(process.env.MAX_RESTREAM_RETRIES || '3', 10);
  let retryCount = 0;
  let finalPreviousLastEventType: string | null = null;

  while (retryCount < maxRetries) {
    let previousLastEventType: string | null = null;
    let lastEventType: string | null = null;

    const response = await agent.stream({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      ...(threadId && resourceId
        ? {
            memory: {
              thread: threadId,
              resource: resourceId,
            },
          }
        : {}),
    });

    await response.processDataStream({
      onChunk: async (chunk: unknown) => {
        if (!chunk || typeof chunk !== 'object') return;

        const clientEvent = useNetworkMapper
          ? mapNetworkEventToClientEvent(chunk)
          : chunk;

        if (clientEvent) {
          const eventObj = clientEvent as { type?: string };
          if (eventObj.type) {
            previousLastEventType = lastEventType;
            lastEventType = eventObj.type;
          }

          // Don't send error events to client during streaming
          // They will be handled after max retries check
          if (eventObj.type === 'error') {
            const errorPayload =
              'payload' in eventObj
                ? (eventObj as { payload: unknown }).payload
                : undefined;
            logger.warn(
              { eventType: eventObj.type, payload: errorPayload },
              'Error event received during stream, not sending to client'
            );
          } else {
            const data = `data: ${JSON.stringify(clientEvent)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
        }
      },
    });

    // Check if we need to restream
    // lastEventType should be 'step-finish', but we check if previousLastEventType was 'text-end'
    if (previousLastEventType !== 'text-end') {
      finalPreviousLastEventType = previousLastEventType;
      retryCount++;
      logger.warn(
        { lastEventType, previousLastEventType, retryCount, maxRetries },
        'Stream ended without text-end before finish, restreaming'
      );

      const restreamData = `data: ${JSON.stringify({
        type: 'restream-needed',
        payload: { lastEventType, previousLastEventType, retryCount },
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(restreamData));

      // Add continuation message and retry
      messages.push({ role: 'user', content: 'continue' });
    } else {
      // Successfully completed
      break;
    }
  }

  // After all retries, if previousLastEventType is still error, send error to client
  if (retryCount >= maxRetries && finalPreviousLastEventType === 'error') {
    logger.error(
      { retryCount, maxRetries, finalPreviousLastEventType },
      'Max restream retries reached with error'
    );

    const errorData = `data: ${JSON.stringify({
      type: 'error',
      payload: { error: 'Stream processing failed after retries' },
    })}\n\n`;
    controller.enqueue(new TextEncoder().encode(errorData));
  }
}

function createStreamingResponse(
  agent: ReturnType<typeof mastraClient.getAgent>,
  messages: unknown[],
  agentId: string,
  threadId?: string,
  resourceId?: string,
  useNetworkMapper: boolean = false
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamAgentResponse(
          agent,
          messages,
          threadId,
          resourceId,
          controller,
          useNetworkMapper
        );

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

const handleValidationError = (error: z.ZodError<unknown>) => {
  const firstError = error.issues[0];
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

    return createStreamingResponse(
      agent,
      messages,
      agentId,
      threadId,
      resourceId,
      false // using agent.stream, not network mapper
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
