import pino from 'pino';

/**
 * Safe logger configuration that works in all environments
 * including serverless and Edge Runtime
 */
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    // Simple console-based logging for development
    return pino({
      level: 'debug',
      formatters: {
        level: label => {
          return { level: label.toUpperCase() };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        env: process.env.NODE_ENV,
      },
    });
  }

  // Production logging without transports
  return pino({
    level: 'info',
    base: {
      env: process.env.NODE_ENV,
    },
  });
};

/**
 * Configured pino logger instance for the application
 */
export const logger = createLogger();
