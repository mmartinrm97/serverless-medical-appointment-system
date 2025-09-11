/**
 * Structured logging configuration with Pino
 * Provides consistent logging across all Lambda functions
 */

import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Logger configuration based on environment
 */
const loggerConfig: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  base: {
    service: 'medical-appointments-api',
    stage: env.STAGE,
    version: '1.0.0',
  },
  // Production: JSON format for CloudWatch
  // Development: Pretty format for local development
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  // Don't log in test environment unless specified
  enabled: !(env.NODE_ENV === 'test' && env.LOG_LEVEL !== 'debug'),
};

/**
 * Global logger instance
 */
export const logger = pino(loggerConfig);

/**
 * Create a child logger with additional context
 *
 * @param context - Additional context to include in all log messages
 * @returns Child logger instance
 *
 * @example
 * ```typescript
 * const handlerLogger = createLogger({ handler: 'postAppointment' });
 * handlerLogger.info('Processing request');
 * ```
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

/**
 * Logger for specific Lambda function
 *
 * @param functionName - Name of the Lambda function
 * @returns Logger instance with function context
 */
export const createFunctionLogger = (functionName: string) => {
  return createLogger({ function: functionName });
};

/**
 * Utility to safely log errors without sensitive data
 *
 * @param error - Error object to log
 * @param context - Additional context
 */
export const logError = (
  error: unknown,
  context: Record<string, unknown> = {}
) => {
  const errorContext = {
    ...context,
    error: {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Error',
    },
  };

  logger.error(errorContext, 'Error occurred');
};
