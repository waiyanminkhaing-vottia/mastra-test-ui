import pino from 'pino';

const createLogger = () => {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: label => ({ level: label.toUpperCase() }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      env: process.env.NODE_ENV,
    },
  });
};

/**
 *
 */
export const logger = createLogger();
