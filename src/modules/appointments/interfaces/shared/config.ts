/**
 * Interface Layer Configuration
 * 
 * This file contains configuration constants and endpoint definitions
 * for the Interfaces Layer of the Medical Appointments API.
 */

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
    APPOINTMENTS: {
        CREATE: '/appointments',
        GET_BY_INSURED: '/appointments/{insuredId}',
        HEALTH: '/health',
    },
} as const;

/**
 * SQS Queue configuration
 */
export const SQS_QUEUES = {
    PENDING_APPOINTMENTS: {
        PE: process.env.PENDING_APPOINTMENTS_QUEUE_PE_URL ?? '',
        CL: process.env.PENDING_APPOINTMENTS_QUEUE_CL_URL ?? '',
    },
    COMPLETED_APPOINTMENTS: {
        PE: process.env.COMPLETED_APPOINTMENTS_QUEUE_PE_URL ?? '',
        CL: process.env.COMPLETED_APPOINTMENTS_QUEUE_CL_URL ?? '',
    },
} as const;

/**
 * HTTP methods supported by the API
 */
export const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    OPTIONS: 'OPTIONS',
} as const;

/**
 * Content types
 */
export const CONTENT_TYPES = {
    JSON: 'application/json',
    TEXT: 'text/plain',
    HTML: 'text/html',
} as const;

/**
 * HTTP status codes commonly used in the API
 */
export const HTTP_STATUS_CODES = {
    // Success
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,

    // Client Errors
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,

    // Server Errors
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Request validation limits
 */
export const VALIDATION_LIMITS = {
    APPOINTMENT: {
        INSURED_ID_LENGTH: 5,
        MAX_APPOINTMENTS_PER_REQUEST: 50,
        MAX_PAGINATION_LIMIT: 100,
        DEFAULT_PAGINATION_LIMIT: 50,
    },
    SQS: {
        MAX_BATCH_SIZE: 10,
        MAX_MESSAGE_SIZE: 262144, // 256KB
        MAX_RECEIVE_COUNT: 3,
    },
} as const;

/**
 * Country codes supported by the API
 */
export const SUPPORTED_COUNTRIES = ['PE', 'CL'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

/**
 * Appointment statuses
 */
export const APPOINTMENT_STATUSES = ['pending', 'completed'] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

/**
 * Message priorities for SQS
 */
export const MESSAGE_PRIORITIES = ['high', 'normal', 'low'] as const;
export type MessagePriority = typeof MESSAGE_PRIORITIES[number];

/**
 * Lambda function names (for reference)
 */
export const LAMBDA_FUNCTIONS = {
    HTTP: {
        POST_APPOINTMENT: 'postAppointment',
        GET_APPOINTMENTS: 'getAppointments',
    },
    SQS: {
        PROCESS_PENDING_APPOINTMENT: 'processPendingAppointmentQueue',
        PROCESS_COMPLETED_APPOINTMENT: 'processCompletedAppointmentQueue',
    },
} as const;

/**
 * Environment variable names
 */
export const ENV_VARS = {
    // AWS
    AWS_REGION: 'AWS_REGION',

    // DynamoDB
    APPOINTMENTS_TABLE: 'APPOINTMENTS_TABLE',

    // SQS
    PENDING_APPOINTMENTS_QUEUE_PE_URL: 'PENDING_APPOINTMENTS_QUEUE_PE_URL',
    PENDING_APPOINTMENTS_QUEUE_CL_URL: 'PENDING_APPOINTMENTS_QUEUE_CL_URL',
    COMPLETED_APPOINTMENTS_QUEUE_PE_URL: 'COMPLETED_APPOINTMENTS_QUEUE_PE_URL',
    COMPLETED_APPOINTMENTS_QUEUE_CL_URL: 'COMPLETED_APPOINTMENTS_QUEUE_CL_URL',

    // Logging
    LOG_LEVEL: 'LOG_LEVEL',
    NODE_ENV: 'NODE_ENV',
    STAGE: 'STAGE',
} as const;
