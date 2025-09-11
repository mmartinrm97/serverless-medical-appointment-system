import { APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';
import { AppError } from '../../../../shared/domain/errors/AppError.js';
import { createLogger } from '../../../../shared/infrastructure/logging/logger.js';

const logger = createLogger({ module: 'httpUtils' });

/**
 * Standard CORS headers for API Gateway responses
 */
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
} as const;

/**
 * Standard error response structure
 */
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Standard success response structure
 */
export interface SuccessResponse<T = unknown> {
    data: T;
    timestamp: string;
    requestId?: string;
}

/**
 * Creates a standardized success response
 * 
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @param requestId - Optional request ID for tracing
 * @returns API Gateway proxy result
 */
export const createSuccessResponse = <T>(
    data: T,
    statusCode: number = 200,
    requestId?: string
): APIGatewayProxyResult => {
    const response: SuccessResponse<T> = {
        data,
        timestamp: new Date().toISOString(),
        requestId,
    };

    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify(response),
    };
};

/**
 * Creates a standardized error response
 * 
 * @param error - Error object or message
 * @param statusCode - HTTP status code (default: 500)
 * @param requestId - Optional request ID for tracing
 * @returns API Gateway proxy result
 */
export const createErrorResponse = (
    error: unknown,
    statusCode: number = 500,
    requestId?: string
): APIGatewayProxyResult => {
    let errorCode: string;
    let errorMessage: string;
    let errorDetails: unknown;

    // Handle different error types
    if (error instanceof AppError) {
        errorCode = error.code;
        errorMessage = error.message;
        statusCode = getStatusCodeFromAppError(error);
    } else if (error instanceof ZodError) {
        errorCode = 'VALIDATION_ERROR';
        errorMessage = 'Request validation failed';
        errorDetails = error.issues.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
        }));
        statusCode = 400;
    } else if (error instanceof Error) {
        errorCode = 'INTERNAL_ERROR';
        errorMessage = error.message;
    } else {
        errorCode = 'UNKNOWN_ERROR';
        errorMessage = 'An unknown error occurred';
    }

    const response: ErrorResponse = {
        error: {
            code: errorCode,
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date().toISOString(),
            requestId,
        },
    };

    // Log error for monitoring
    const errorLogger = logger.child({
        statusCode,
        errorCode,
        errorMessage,
        requestId,
    });
    errorLogger.error('HTTP Error Response Created');

    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify(response),
    };
};

/**
 * Maps AppError codes to appropriate HTTP status codes
 * 
 * @param error - AppError instance
 * @returns HTTP status code
 */
const getStatusCodeFromAppError = (error: AppError): number => {
    switch (error.code) {
        case 'APPOINTMENT_NOT_FOUND':
        case 'SCHEDULE_NOT_FOUND':
            return 404;

        case 'APPOINTMENT_CONFLICT':
        case 'SCHEDULE_NOT_AVAILABLE':
        case 'INVALID_APPOINTMENT_STATUS':
            return 409;

        case 'INVALID_INSURED_ID':
        case 'INVALID_COUNTRY_CODE':
        case 'MISSING_REQUIRED_FIELD':
            return 400;

        case 'UNAUTHORIZED_ACCESS':
            return 401;

        case 'FORBIDDEN_OPERATION':
            return 403;

        case 'RATE_LIMIT_EXCEEDED':
            return 429;

        default:
            return 500;
    }
};

/**
 * Extracts request ID from API Gateway event
 * 
 * @param event - API Gateway proxy event
 * @returns Request ID or undefined
 */
export const getRequestId = (event: { requestContext?: { requestId?: string } }): string | undefined => {
    return event.requestContext?.requestId;
};

/**
 * Creates a health check response
 * 
 * @param requestId - Optional request ID for tracing
 * @returns API Gateway proxy result
 */
export const createHealthCheckResponse = (requestId?: string): APIGatewayProxyResult => {
    return createSuccessResponse(
        {
            status: 'healthy',
            service: 'medical-appointments-api',
            version: '1.0.0',
        },
        200,
        requestId
    );
};
