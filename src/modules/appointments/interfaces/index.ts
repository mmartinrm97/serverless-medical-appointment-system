/**
 * Interfaces Layer Barrel Export
 *
 * This file provides a central export point for all interfaces layer components,
 * making it easier to import interfaces functionality from other parts of the application.
 */

// HTTP Handlers
export { handler as postAppointmentHandler } from './http/postAppointment.js';
export { handler as getAppointmentsHandler } from './http/getAppointments.js';

// HTTP Schemas
export * from './http/schemas/CreateAppointmentSchema.js';
export * from './http/schemas/GetAppointmentsSchema.js';

// SQS Handlers
export { handler as processPendingAppointmentQueueHandler } from './sqs/processPendingAppointmentQueue.js';
export { handler as processCompletedAppointmentQueueHandler } from './sqs/processCompletedAppointmentQueue.js';

// SQS Schemas
export * from './sqs/schemas/ProcessPendingAppointmentSchema.js';
export * from './sqs/schemas/ProcessCompletedAppointmentSchema.js';

// Shared Utilities
export * from './shared/httpUtils.js';
export * from './shared/sqsUtils.js';
export {
  API_ENDPOINTS,
  SQS_QUEUES,
  HTTP_METHODS,
  CONTENT_TYPES,
  HTTP_STATUS_CODES,
  VALIDATION_LIMITS,
  SUPPORTED_COUNTRIES,
  APPOINTMENT_STATUSES,
  LAMBDA_FUNCTIONS,
  ENV_VARS,
  type SupportedCountry,
  type AppointmentStatus,
} from './shared/config.js';
