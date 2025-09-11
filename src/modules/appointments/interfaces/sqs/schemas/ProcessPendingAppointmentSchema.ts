import { z } from 'zod';

// SQS Message structure for processing pending appointments
export const ProcessPendingAppointmentMessageSchema = z.object({
  Records: z.array(
    z.object({
      messageId: z.string(),
      receiptHandle: z.string(),
      body: z.string(),
      attributes: z.object({
        ApproximateReceiveCount: z.string(),
        SentTimestamp: z.string(),
        SenderId: z.string(),
        ApproximateFirstReceiveTimestamp: z.string(),
      }),
      messageAttributes: z.record(z.string(), z.any()).optional(),
      md5OfBody: z.string(),
      eventSource: z.literal('aws:sqs'),
      eventSourceARN: z.string(),
      awsRegion: z.string(),
    })
  ),
});

// Message body schema for pending appointment processing
export const PendingAppointmentPayloadSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID format'),
  insuredId: z.string().regex(/^\d{5}$/, 'Insured ID must be exactly 5 digits'),
  countryISO: z.enum(['PE', 'CL'], {
    message: 'Country must be PE or CL',
  }),
  scheduleId: z.string().uuid('Invalid schedule ID format'),
  centerId: z.string().min(1, 'Center ID is required'),
  specialtyId: z.string().min(1, 'Specialty ID is required'),
  medicId: z.string().min(1, 'Medic ID is required'),
  timestamp: z.string().datetime('Invalid timestamp format'),
});

// Types
export type ProcessPendingAppointmentMessage = z.infer<
  typeof ProcessPendingAppointmentMessageSchema
>;
export type PendingAppointmentPayload = z.infer<
  typeof PendingAppointmentPayloadSchema
>;

// Validation functions
export const validateProcessPendingAppointmentMessage = (
  data: unknown
): ProcessPendingAppointmentMessage => {
  return ProcessPendingAppointmentMessageSchema.parse(data);
};

export const validatePendingAppointmentPayload = (
  data: unknown
): PendingAppointmentPayload => {
  return PendingAppointmentPayloadSchema.parse(data);
};
