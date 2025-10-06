/**
 * Application configuration constants
 */

/**
 * API Configuration - Request limits, timeouts, and agent settings
 */
export const API_CONFIG = {
  // Request limits
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  MAX_MESSAGES_COUNT: 100,
  MAX_MESSAGE_LENGTH: 10000,

  // Agent configuration
  DEFAULT_AGENT_ID: 'mainAgent',
  AGENT_ID_MAX_LENGTH: 50,
} as const;

/**
 * UI Configuration - Scrolling, input limits, and timing
 */
export const UI_CONFIG = {
  // Auto-scroll threshold
  SCROLL_THRESHOLD: 100, // pixels from bottom
  AUTO_SCROLL_DELAY: 100, // milliseconds

  // Message input
  MESSAGE_INPUT_MAX_LENGTH: 10000,
  MESSAGE_INPUT_MAX_HEIGHT: 200, // pixels
  MESSAGE_LENGTH_WARNING_THRESHOLD: 0.8, // 80% of max

  // Animation timings
  THINKING_DOT_ANIMATION_DURATION: '0.6s',
  THINKING_DOT_DELAYS: ['0ms', '0.2s', '0.4s'] as const,
} as const;

/**
 * Security Configuration - CORS, validation, and rate limiting
 */
export const SECURITY_CONFIG = {
  // CORS
  ALLOWED_METHODS: 'GET, POST, PUT, DELETE, OPTIONS',
  ALLOWED_HEADERS: 'Content-Type, Authorization, X-Requested-With',
  CORS_MAX_AGE: '86400', // 24 hours

  // Input validation
  AGENT_ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
} as const;

/**
 * Environment-specific configuration
 */
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  MASTRA_SERVER_URL: process.env.MASTRA_SERVER_URL || 'http://localhost:4000',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
} as const;
