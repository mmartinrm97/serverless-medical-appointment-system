/**
 * Confirm Appointment Use Case
 * Handles appointment confirmation from SQS completion queue
 */

import type { IAppointmentsRepository } from '../../domain/repositories/IAppointmentsRepository.js';
import type { AppointmentConfirmedEvent } from '../../domain/events/AppointmentConfirmed.js';
import { isAppointmentConfirmedEvent, validateAppointmentConfirmedData } from '../../domain/events/AppointmentConfirmed.js';
import { NotFoundError, ValidationError } from '@/shared/domain/errors/index.js';
import { logger } from '@/shared/infrastructure/logging/logger.js';

/**
 * Result of appointment confirmation processing
 */
export interface ConfirmAppointmentResult {
    appointmentId: string;
    previousStatus: string;
    newStatus: 'completed';
    updatedAt: string;
    processedBy: string;
}

/**
 * Use Case for confirming appointments from completion events
 * 
 * This Use Case orchestrates the following steps:
 * 1. Validate incoming event structure
 * 2. Find appointment in DynamoDB
 * 3. Update appointment status to "completed"
 * 4. Log confirmation details
 */
export class ConfirmAppointment {
    constructor(
        private readonly appointmentsRepository: IAppointmentsRepository
    ) { }

    /**
     * Execute appointment confirmation from EventBridge event
     * 
     * @param event - AppointmentConfirmed event from EventBridge
     * @returns Promise with confirmation result
     * @throws ValidationError if event structure is invalid
     * @throws NotFoundError if appointment not found
     * 
     * @example
     * ```typescript
     * const useCase = new ConfirmAppointment(repository);
     * const result = await useCase.executeFromEvent(eventBridgeEvent);
     * ```
     */
    public async executeFromEvent(event: unknown): Promise<ConfirmAppointmentResult> {
        logger.info('Processing appointment confirmation event');

        try {
            // Step 1: Validate event structure
            if (!isAppointmentConfirmedEvent(event)) {
                throw new ValidationError(
                    'Invalid AppointmentConfirmed event structure',
                    { event }
                );
            }

            const appointmentConfirmedEvent = event as AppointmentConfirmedEvent;

            if (!validateAppointmentConfirmedData(appointmentConfirmedEvent.detail)) {
                throw new ValidationError(
                    'Invalid event detail structure',
                    { detail: appointmentConfirmedEvent.detail }
                );
            }

            // Step 2: Execute confirmation with validated data
            return await this.execute(appointmentConfirmedEvent.detail);

        } catch (error) {
            logger.error(`Failed to process appointment confirmation event: ${error}`);
            throw error;
        }
    }

    /**
     * Execute appointment confirmation with validated data
     * 
     * @param confirmationData - Validated appointment confirmation data
     * @returns Promise with confirmation result
     */
    public async execute(confirmationData: {
        appointmentId: string;
        insuredId: string;
        scheduleId: number;
        countryISO: string;
        processedAt: string;
        source: string;
    }): Promise<ConfirmAppointmentResult> {
        const { appointmentId, source } = confirmationData;

        logger.info(`Confirming appointment ${appointmentId} processed by ${source}`);

        try {
            // Step 1: Find appointment in repository
            const appointment = await this.appointmentsRepository.findById(appointmentId);

            if (!appointment) {
                throw new NotFoundError('Appointment', appointmentId);
            }

            // Verify appointment belongs to the insured (additional safety check)
            if (appointment.insuredId !== confirmationData.insuredId) {
                throw new ValidationError(
                    'Appointment insured ID mismatch',
                    {
                        appointmentId,
                        expectedInsuredId: confirmationData.insuredId,
                        actualInsuredId: appointment.insuredId,
                    }
                );
            }

            const previousStatus = appointment.status;

            // Step 2: Update appointment status to "completed"
            const updatedAppointment = await this.appointmentsRepository.updateStatus(
                appointmentId,
                'completed'
            );

            if (!updatedAppointment) {
                throw new NotFoundError('Appointment', appointmentId);
            }

            logger.info(`Successfully confirmed appointment ${appointmentId}: ${previousStatus} -> completed`);

            // Step 3: Return confirmation result
            return {
                appointmentId,
                previousStatus,
                newStatus: 'completed',
                updatedAt: updatedAppointment.updatedAt.toISOString(),
                processedBy: source,
            };

        } catch (error) {
            logger.error(`Failed to confirm appointment ${appointmentId}: ${error}`);
            throw error;
        }
    }

    /**
     * Execute batch confirmation for multiple appointments
     * Useful for processing SQS batch messages
     * 
     * @param confirmationEvents - Array of confirmation events
     * @returns Promise with array of confirmation results
     */
    public async executeBatch(confirmationEvents: unknown[]): Promise<ConfirmAppointmentResult[]> {
        logger.info(`Processing batch of ${confirmationEvents.length} confirmation events`);

        const results: ConfirmAppointmentResult[] = [];
        const errors: Array<{ event: unknown; error: Error }> = [];

        // Process each event individually (could be parallelized for better performance)
        for (const event of confirmationEvents) {
            try {
                const result = await this.executeFromEvent(event);
                results.push(result);
            } catch (error) {
                logger.error(`Failed to process event in batch: ${error}`);
                errors.push({ event, error: error as Error });
            }
        }

        logger.info(`Batch processing completed: ${results.length} success, ${errors.length} errors`);

        // In a production system, you might want to handle partial failures differently
        // For now, we'll return successful results and let the caller decide on error handling
        if (errors.length > 0) {
            logger.error(`Batch processing had ${errors.length} errors: ${JSON.stringify(errors)}`);
        }

        return results;
    }
}
