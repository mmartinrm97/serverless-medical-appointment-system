/**
 * Application Use Cases exports
 * Centralized exports for all Use Cases
 */

// Core Use Cases
export * from './CreateAppointment.js';
export * from './ListAppointmentsByInsured.js';
export * from './ConfirmAppointment.js';

// Country-specific Use Cases
export * from './ProcessAppointmentPE.js';
export * from './ProcessAppointmentCL.js';
