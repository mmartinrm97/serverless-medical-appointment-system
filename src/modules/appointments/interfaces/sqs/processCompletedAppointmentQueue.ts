import { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { ZodError } from 'zod';

import {
    validateCompletedAppointmentPayload,
    CompletedAppointmentPayload
} from './schemas/ProcessCompletedAppointmentSchema.js';
import { createFunctionLogger } from '../../../../shared/infrastructure/logging/logger.js';
import { AppError } from '../../../../shared/domain/errors/AppError.js';

// Initialize logger for this handler
const logger = createFunctionLogger('processCompletedAppointmentQueue');

/**
 * SQS handler for processing completed appointments
 * 
 * This handler processes messages from the SQS queue containing completed appointments
 * that need final processing. It validates the message structure, extracts the appointment
 * completion data, and handles post-completion business logic.
 * 
 * Note: This is a placeholder implementation. In a real scenario, this would
 * call a ProcessCompletedAppointment use case to handle the business logic.
 * 
 * @param event - SQS event containing the messages to process
 * @returns Promise<void>
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
    const handlerLogger = logger.child({ recordCount: event.Records.length });
    handlerLogger.info('Processing completed appointment queue');

    // Process each record in the batch
    const processingPromises = event.Records.map(async (record: SQSRecord) => {
        const recordLogger = logger.child({
            messageId: record.messageId,
            receiptHandle: record.receiptHandle
        });

        try {
            recordLogger.info('Processing SQS record');

            // Parse and validate the message body
            let appointmentPayload: CompletedAppointmentPayload;
            try {
                const parsedBody = JSON.parse(record.body);
                appointmentPayload = validateCompletedAppointmentPayload(parsedBody);
            } catch (parseError) {
                if (parseError instanceof ZodError) {
                    recordLogger.error('Invalid message payload structure');
                    // Don't throw - mark as processed to avoid infinite retries
                    return;
                }
                throw parseError;
            }

            const appointmentLogger = recordLogger.child({
                appointmentId: appointmentPayload.appointmentId,
                insuredId: appointmentPayload.insuredId,
                countryISO: appointmentPayload.countryISO,
                success: appointmentPayload.processingResult.success
            });

            appointmentLogger.info('Processing completed appointment');

            // Placeholder: Execute the use case when ProcessCompletedAppointment is implemented
            // This would handle post-completion logic like notifications, analytics, cleanup, etc.
            if (appointmentPayload.processingResult.success) {
                appointmentLogger.info('Appointment completed successfully - would send success notifications');

                // Handle successful completion:
                // - Send confirmation notifications
                // - Update analytics/metrics
                // - Trigger follow-up workflows
                // - Archive appointment data

            } else {
                appointmentLogger.warn('Appointment processing failed - would handle failure case');

                // Handle failed completion:
                // - Send failure notifications
                // - Log for investigation
                // - Trigger retry mechanisms if applicable
                // - Update failure metrics
            }

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 50));

            appointmentLogger.info('Completed appointment processed successfully');

        } catch (error) {
            recordLogger.error('Error processing completed appointment record');

            // For application errors, log and continue processing other records
            if (error instanceof AppError) {
                recordLogger.warn('Business logic error - continuing with other records');
                return;
            }

            // For unexpected errors, re-throw to trigger SQS retry mechanism
            throw error;
        }
    });

    // Wait for all records to be processed
    await Promise.allSettled(processingPromises);

    handlerLogger.info('Batch processing completed');
};
