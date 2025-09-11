import { z } from 'zod';

/**
 * Zod schema for validating POST /appointments request body
 */
export const CreateAppointmentSchema = z.object({
  insuredId: z
    .string()
    .regex(/^\d{5}$/, 'insuredId must be exactly 5 digits')
    .describe('5-digit insured code (e.g., "01234")'),

  scheduleId: z
    .number()
    .positive('scheduleId must be a positive number')
    .int('scheduleId must be an integer')
    .describe('ID of the appointment slot'),

  countryISO: z
    .enum(['PE', 'CL'])
    .describe('Country code - only PE (Peru) or CL (Chile) allowed'),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type CreateAppointmentRequest = z.infer<typeof CreateAppointmentSchema>;

/**
 * Response schema for successful appointment creation
 */
export const CreateAppointmentResponseSchema = z.object({
  appointmentId: z.string().describe('ULID generated for the new appointment'),

  status: z.literal('pending').describe('Initial status of the appointment'),
});

/**
 * TypeScript type for the response
 */
export type CreateAppointmentResponse = z.infer<
  typeof CreateAppointmentResponseSchema
>;

/**
 * Validation function that throws detailed error messages
 *
 * @param data - Raw request body to validate
 * @returns Parsed and validated request data
 * @throws {z.ZodError} When validation fails with detailed error messages
 */
export function validateCreateAppointmentRequest(
  data: unknown
): CreateAppointmentRequest {
  return CreateAppointmentSchema.parse(data);
}
