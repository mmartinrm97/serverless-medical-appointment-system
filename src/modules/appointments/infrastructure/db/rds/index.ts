/**
 * RDS infrastructure exports
 *
 * Barrel file for RDS-related infrastructure components.
 * Includes MySQL client, connection management, and country-specific writers.
 */

export { RDSClient, RDSTransaction, type RDSConfig } from './RDSClient.js';
export { AppointmentWriterPE } from './AppointmentWriterPE.js';
export { AppointmentWriterCL } from './AppointmentWriterCL.js';
