import { SQSHandler, SQSEvent, SQSRecord } from 'aws-lambda';
import { ZodError } from 'zod';

import {
  validatePendingAppointmentPayload,
  PendingAppointmentPayload,
} from './schemas/ProcessPendingAppointmentSchema.js';
import { createFunctionLogger } from '../../../../shared/infrastructure/logging/logger.js';
import { AppError } from '../../../../shared/domain/errors/AppError.js';

// Initialize logger for this handler
const logger = createFunctionLogger('processPendingAppointmentQueue');

/**
 * SQS handler for processing pending appointments
 *
 * This handler processes messages from the SQS queue containing pending appointments
 * that need to be processed. It validates the message structure, extracts the appointment
 * data, and simulates processing of the appointment.
 *
 * Note: This is a placeholder implementation. In a real scenario, this would
 * call a ProcessPendingAppointment use case to handle the business logic.
 *
 * @param event - SQS event containing the messages to process
 * @returns Promise<void>
 */
export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const handlerLogger = logger.child({ recordCount: event.Records.length });
  handlerLogger.info('Processing pending appointment queue');

  // Initialize dependencies (placeholder for future use case implementation)

  // Process each record in the batch
  const processingPromises = event.Records.map(async (record: SQSRecord) => {
    const recordLogger = logger.child({
      messageId: record.messageId,
      receiptHandle: record.receiptHandle,
    });

    try {
      recordLogger.info('Processing SQS record');

      // Parse and validate the message body
      let appointmentPayload: PendingAppointmentPayload;
      try {
        const parsedBody = JSON.parse(record.body);
        appointmentPayload = validatePendingAppointmentPayload(parsedBody);
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
      });

      appointmentLogger.info('Processing appointment');

      // Placeholder: Execute the use case when ProcessPendingAppointment is implemented
      // This would call the ProcessPendingAppointment use case with the validated payload
      appointmentLogger.info(
        'Would execute ProcessPendingAppointment use case'
      );

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));

      appointmentLogger.info('Appointment processed successfully');
    } catch (error) {
      recordLogger.error('Error processing appointment record');

      // For application errors, log and continue processing other records
      if (error instanceof AppError) {
        recordLogger.warn(
          'Business logic error - continuing with other records'
        );
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
