import { z } from 'zod';

// SQS Message structure for processing completed appointments
export const ProcessCompletedAppointmentMessageSchema = z.object({
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

// Message body schema for completed appointment processing
export const CompletedAppointmentPayloadSchema = z.object({
    appointmentId: z.string().uuid('Invalid appointment ID format'),
    insuredId: z.string().regex(/^\d{5}$/, 'Insured ID must be exactly 5 digits'),
    countryISO: z.enum(['PE', 'CL'], {
        message: 'Country must be PE or CL'
    }),
    scheduleId: z.string().uuid('Invalid schedule ID format'),
    centerId: z.string().min(1, 'Center ID is required'),
    specialtyId: z.string().min(1, 'Specialty ID is required'),
    medicId: z.string().min(1, 'Medic ID is required'),
    completedAt: z.string().datetime('Invalid completion timestamp format'),
    processingResult: z.object({
        success: z.boolean(),
        processedAt: z.string().datetime('Invalid processing timestamp format'),
        details: z.record(z.string(), z.any()).optional(),
    }),
});

// Types
export type ProcessCompletedAppointmentMessage = z.infer<typeof ProcessCompletedAppointmentMessageSchema>;
export type CompletedAppointmentPayload = z.infer<typeof CompletedAppointmentPayloadSchema>;

// Validation functions
export const validateProcessCompletedAppointmentMessage = (data: unknown): ProcessCompletedAppointmentMessage => {
    return ProcessCompletedAppointmentMessageSchema.parse(data);
};

export const validateCompletedAppointmentPayload = (data: unknown): CompletedAppointmentPayload => {
    return CompletedAppointmentPayloadSchema.parse(data);
};
