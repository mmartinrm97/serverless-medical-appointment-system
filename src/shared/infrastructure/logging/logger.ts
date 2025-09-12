/**
 * Optimized Lambda logging utility
 * Uses native console methods for best performance in AWS Lambda
 */

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  info: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
}

/**
 * Creates a logger with optional context
 * Optimized for AWS Lambda - uses console methods directly
 */
const createLogger = (baseContext: LogContext = {}): Logger => ({
  info: (message: string, context: LogContext = {}) => {
    console.log(JSON.stringify({
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...baseContext,
      ...context
    }));
  },

  error: (message: string, context: LogContext = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      ...baseContext,
      ...context
    }));
  },

  warn: (message: string, context: LogContext = {}) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      ...baseContext,
      ...context
    }));
  },

  debug: (message: string, context: LogContext = {}) => {
    console.log(JSON.stringify({
      level: 'DEBUG',
      message,
      timestamp: new Date().toISOString(),
      ...baseContext,
      ...context
    }));
  }
});

// Default logger instance
export const logger = createLogger();

// Factory function for contextual loggers
export { createLogger };

// Lambda function logger with function name context
export const createFunctionLogger = (functionName: string): Logger => {
  return createLogger({ function: functionName });
};

// Error logging utility
export const logError = (
  error: unknown,
  context: LogContext = {}
): void => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const errorStack = error instanceof Error ? error.stack : undefined;

  logger.error('Error occurred', {
    ...context,
    error: errorMessage,
    stack: errorStack
  });
};
