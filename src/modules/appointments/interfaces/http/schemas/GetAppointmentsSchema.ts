import { z } from 'zod';

/**
 * Zod schema for validating GET /appointments/{insuredId} path parameters
 */
export const GetAppointmentsPathSchema = z.object({
  insuredId: z
    .string()
    .regex(/^\d{5}$/, 'insuredId must be exactly 5 digits')
    .describe('5-digit insured code (e.g., "01234")'),
});

/**
 * Zod schema for validating GET /appointments/{insuredId} query parameters
 */
export const GetAppointmentsQuerySchema = z.object({
  status: z
    .enum(['pending', 'completed'])
    .optional()
    .describe('Filter appointments by status'),

  limit: z
    .string()
    .regex(/^\d+$/, 'limit must be a positive number')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'limit must be between 1 and 100')
    .optional()
    .describe(
      'Maximum number of appointments to return (default: 50, max: 100)'
    ),

  lastKey: z
    .string()
    .optional()
    .describe('Pagination key for next page of results'),
});

/**
 * TypeScript types inferred from the Zod schemas
 */
export type GetAppointmentsPathParams = z.infer<
  typeof GetAppointmentsPathSchema
>;
export type GetAppointmentsQueryParams = z.infer<
  typeof GetAppointmentsQuerySchema
>;

/**
 * Combined request parameters
 */
export interface GetAppointmentsRequest {
  pathParameters: GetAppointmentsPathParams;
  queryParameters?: GetAppointmentsQueryParams;
}

/**
 * Response schema for appointments list
 */
export const GetAppointmentsResponseSchema = z.object({
  appointments: z.array(
    z.object({
      appointmentId: z.string().describe('ULID of the appointment'),
      scheduleId: z.number().describe('Schedule slot ID'),
      countryISO: z.enum(['PE', 'CL']).describe('Country code'),
      status: z.enum(['pending', 'completed']).describe('Appointment status'),
      createdAt: z.string().describe('ISO timestamp when created'),
      updatedAt: z.string().describe('ISO timestamp when last updated'),
      centerId: z.number().optional().describe('Medical center ID'),
      specialtyId: z.number().optional().describe('Medical specialty ID'),
      medicId: z.number().optional().describe('Doctor ID'),
    })
  ),

  pagination: z.object({
    total: z.number().describe('Total number of appointments'),
    limit: z.number().describe('Items per page limit'),
    hasMore: z.boolean().describe('Whether there are more results'),
    lastKey: z.string().optional().describe('Key for next page'),
  }),
});

/**
 * TypeScript type for the response
 */
export type GetAppointmentsResponse = z.infer<
  typeof GetAppointmentsResponseSchema
>;

/**
 * Validation function for path parameters
 *
 * @param pathParameters - Raw path parameters to validate
 * @returns Parsed and validated path parameters
 * @throws {z.ZodError} When validation fails
 */
export function validateGetAppointmentsPath(
  pathParameters: unknown
): GetAppointmentsPathParams {
  return GetAppointmentsPathSchema.parse(pathParameters);
}

/**
 * Validation function for query parameters
 *
 * @param queryParameters - Raw query parameters to validate
 * @returns Parsed and validated query parameters
 * @throws {z.ZodError} When validation fails
 */
export function validateGetAppointmentsQuery(
  queryParameters: unknown
): GetAppointmentsQueryParams {
  return GetAppointmentsQuerySchema.parse(queryParameters ?? {});
}
