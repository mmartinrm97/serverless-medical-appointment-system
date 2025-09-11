/**
 * Create appointment DTOs
 * Data Transfer Objects for appointment creation requests and responses
 */

import { z } from 'zod';
import type { CountryISO } from '../../domain/entities/Appointment.js';

/**
 * Schema for creating a new appointment
 * Validates the incoming request data
 */
export const CreateAppointmentSchema = z.object({
  insuredId: z
    .string()
    .regex(/^\d{5}$/, 'Insured ID must be exactly 5 digits')
    .describe('5-digit insured user identifier'),

  scheduleId: z
    .number()
    .int()
    .positive('Schedule ID must be a positive integer')
    .describe('Schedule slot identifier'),

  countryISO: z
    .enum(['PE', 'CL'])
    .describe('Country ISO code - Peru (PE) or Chile (CL)'),

  // Optional schedule details that might come from frontend
  centerId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Medical center identifier'),

  specialtyId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Medical specialty identifier'),

  medicId: z.number().int().positive().optional().describe('Doctor identifier'),

  slotDatetime: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      'Must be a valid ISO datetime'
    )
    .optional()
    .transform(date => (date ? new Date(date) : undefined))
    .describe('Appointment slot date and time'),
});

/**
 * TypeScript type for create appointment request
 */
export type CreateAppointmentRequest = z.infer<typeof CreateAppointmentSchema>;

/**
 * Response DTO for successful appointment creation
 */
export interface CreateAppointmentResponse {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
  status: 'pending';
  createdAt: string; // ISO timestamp
  message: string;
}

/**
 * Validate create appointment request data
 *
 * @param data - Raw request data to validate
 * @returns Validated appointment data
 * @throws ValidationError if data is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const validData = validateCreateAppointmentRequest({
 *     insuredId: "12345",
 *     scheduleId: 100,
 *     countryISO: "PE"
 *   });
 * } catch (error) {
 *   // Handle validation error
 * }
 * ```
 */
export const validateCreateAppointmentRequest = (
  data: unknown
): CreateAppointmentRequest => {
  return CreateAppointmentSchema.parse(data);
};

/**
 * Create success response for appointment creation
 *
 * @param appointmentData - Appointment entity data
 * @returns Formatted response DTO
 */
export const createAppointmentSuccessResponse = (appointmentData: {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
  createdAt: Date;
}): CreateAppointmentResponse => {
  return {
    appointmentId: appointmentData.appointmentId,
    insuredId: appointmentData.insuredId,
    scheduleId: appointmentData.scheduleId,
    countryISO: appointmentData.countryISO,
    status: 'pending',
    createdAt: appointmentData.createdAt.toISOString(),
    message: `Appointment scheduled for ${appointmentData.countryISO}. Processing in progress.`,
  };
};
