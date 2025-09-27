import { z } from 'zod';

import { API_CONFIG, SECURITY_CONFIG } from './config';

/**
 * Sanitizes text content by removing dangerous characters
 */
const sanitizeText = (text: string) => {
  return (
    text
      // Remove null bytes and control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
};

/**
 * Schema for validating message content
 */
export const MessageContentSchema = z
  .string()
  .min(1, 'Message content cannot be empty')
  .max(
    API_CONFIG.MAX_MESSAGE_LENGTH,
    `Message content must be under ${API_CONFIG.MAX_MESSAGE_LENGTH} characters`
  )
  .transform(sanitizeText)
  .refine(
    val => val.length > 0,
    'Message content cannot be empty after sanitization'
  );

/**
 * Schema for validating agent ID
 */
export const AgentIdSchema = z
  .string()
  .min(1, 'Agent ID cannot be empty')
  .max(
    API_CONFIG.AGENT_ID_MAX_LENGTH,
    `Agent ID must be under ${API_CONFIG.AGENT_ID_MAX_LENGTH} characters`
  )
  .regex(
    SECURITY_CONFIG.AGENT_ID_PATTERN,
    'Agent ID can only contain letters, numbers, hyphens, and underscores'
  );

/**
 * Schema for validating individual message
 */
export const MessageSchema = z.object({
  role: z.string().min(1, 'Message role is required'),
  content: MessageContentSchema,
});

/**
 * Schema for validating chat request body
 */
export const ChatRequestSchema = z.object({
  messages: z
    .array(MessageSchema)
    .min(1, 'At least one message is required')
    .max(
      API_CONFIG.MAX_MESSAGES_COUNT,
      `Too many messages (max ${API_CONFIG.MAX_MESSAGES_COUNT})`
    ),
  threadId: z.string().optional(),
  resourceId: z.string().optional(),
  agentId: AgentIdSchema.default(API_CONFIG.DEFAULT_AGENT_ID),
});

/**
 * Schema for validating request size
 */
export const RequestSizeSchema = z.object({
  'content-length': z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 0))
    .refine(
      val => val <= API_CONFIG.MAX_REQUEST_SIZE,
      `Request too large (max ${API_CONFIG.MAX_REQUEST_SIZE / 1024 / 1024}MB)`
    ),
});

/**
 * Type definitions derived from schemas
 */
export type ChatRequestBody = z.infer<typeof ChatRequestSchema>;
export type ValidatedMessage = z.infer<typeof MessageSchema>;
export type AgentId = z.infer<typeof AgentIdSchema>;

/**
 * Validates and sanitizes chat request
 */
export function validateChatRequest(body: unknown): ChatRequestBody {
  return ChatRequestSchema.parse(body);
}

/**
 * Validates request headers for size limits
 */
export function validateRequestSize(headers: Headers): void {
  const contentLength = headers.get('content-length');
  RequestSizeSchema.parse({ 'content-length': contentLength });
}
