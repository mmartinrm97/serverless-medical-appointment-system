/**
 * Base application error classes
 * Provides structured error handling for the medical appointments system
 */

/**
 * Base application error class
 * All domain and application errors should extend this class
 */
export abstract class AppError extends Error {
  /**
   * HTTP status code for this error
   */
  public readonly statusCode: number;

  /**
   * Error code for logging and monitoring
   */
  public readonly code: string;

  /**
   * Additional context data
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Whether this error is operational (expected) or programming error
   */
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    context?: Record<string, unknown>,
    isOperational = true
  ) {
    super(message);

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Domain business rule violation error
 */
export class DomainError extends AppError {
  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message, 400, code, context);
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', context);
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} with identifier '${identifier}' not found`,
      404,
      'NOT_FOUND',
      { resource, identifier }
    );
  }
}

/**
 * Conflict error when resource already exists
 */
export class ConflictError extends AppError {
  constructor(
    resource: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 409, 'CONFLICT', { resource, ...context });
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `External service error in ${service}: ${message}`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      { service, ...context }
    );
  }
}

/**
 * Infrastructure error (database, messaging, etc.)
 */
export class InfrastructureError extends AppError {
  constructor(
    operation: string,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Infrastructure error during ${operation}: ${message}`,
      500,
      'INFRASTRUCTURE_ERROR',
      { operation, ...context }
    );
  }
}
