/**
 * Process Appointment PE Use Case
 * Handles appointment processing specifically for Peru
 */

import { Appointment } from '../../domain/entities/Appointment.js';
import { CountryStrategyFactory } from '../../domain/services/CountryStrategyFactory.js';
import type { IEventPublisher } from '../../domain/services/IEventPublisher.js';
import { createAppointmentConfirmedEvent } from '../../domain/events/AppointmentConfirmed.js';
import { ValidationError, InfrastructureError } from '@/shared/domain/errors/index.js';
import { logger } from '@/shared/infrastructure/logging/logger.js';

/**
 * SQS message structure for appointment processing
 */
export interface AppointmentSQSMessage {
    appointmentId: string;
    insuredId: string;
    scheduleId: number;
    countryISO: 'PE';
    status: string;
    createdAt: string;
    centerId?: number;
    specialtyId?: number;
    medicId?: number;
    slotDatetime?: string;
}

/**
 * Result of Peru appointment processing
 */
export interface ProcessAppointmentPEResult {
    appointmentId: string;
    success: boolean;
    message: string;
    processedAt: string;
    rdsWritten: boolean;
    eventPublished: boolean;
}

/**
 * Use Case for processing appointments in Peru
 * 
 * This Use Case orchestrates the following steps:
 * 1. Validate incoming SQS message
 * 2. Reconstruct appointment entity
 * 3. Use Peru strategy to write to RDS
 * 4. Publish confirmation event to EventBridge
 */
export class ProcessAppointmentPE {
    constructor(
        private readonly eventPublisher: IEventPublisher
    ) { }

    /**
     * Execute Peru appointment processing from SQS message
     * 
     * @param sqsMessage - SQS message with appointment data
     * @returns Promise with processing result
     * @throws ValidationError if message structure is invalid
     * @throws InfrastructureError if RDS write or event publish fails
     * 
     * @example
     * ```typescript
     * const useCase = new ProcessAppointmentPE(eventPublisher);
     * const result = await useCase.execute(sqsMessageData);
     * ```
     */
    public async execute(sqsMessage: AppointmentSQSMessage): Promise<ProcessAppointmentPEResult> {
        const { appointmentId, countryISO } = sqsMessage;

        logger.info(`Processing Peru appointment: ${appointmentId}`);

        try {
            // Step 1: Validate message structure and country
            this.validateSQSMessage(sqsMessage);

            if (countryISO !== 'PE') {
                throw new ValidationError(
                    'Invalid country for Peru processor',
                    { appointmentId, countryISO }
                );
            }

            // Step 2: Reconstruct appointment entity from SQS message
            const appointment = this.reconstructAppointmentFromMessage(sqsMessage);

            // Step 3: Use Peru strategy to process appointment (write to RDS)
            let rdsWritten = false;
            try {
                const peruStrategy = CountryStrategyFactory.create('PE');
                const processResult = await peruStrategy.processAppointment(appointment);

                if (!processResult.success) {
                    throw new InfrastructureError(
                        'Peru RDS write',
                        processResult.message,
                        { appointmentId, processResult }
                    );
                }

                rdsWritten = true;
                logger.info(`Successfully wrote appointment ${appointmentId} to Peru RDS`);

            } catch (error) {
                logger.error(`Failed to write appointment ${appointmentId} to Peru RDS: ${error}`);
                throw new InfrastructureError(
                    'Peru RDS write',
                    `Failed to write appointment to Peru database: ${error}`,
                    { appointmentId, error }
                );
            }

            // Step 4: Publish confirmation event to EventBridge
            let eventPublished = false;
            try {
                const confirmationEvent = createAppointmentConfirmedEvent({
                    appointmentId,
                    insuredId: sqsMessage.insuredId,
                    scheduleId: sqsMessage.scheduleId,
                    countryISO: 'PE',
                    source: 'appointment_pe',
                });

                await this.eventPublisher.publishAppointmentConfirmed(confirmationEvent);
                eventPublished = true;
                logger.info(`Published confirmation event for appointment ${appointmentId}`);

            } catch (error) {
                logger.error(`Failed to publish confirmation event for ${appointmentId}: ${error}`);
                throw new InfrastructureError(
                    'EventBridge publish',
                    `Failed to publish confirmation event: ${error}`,
                    { appointmentId, error }
                );
            }

            // Step 5: Return success result
            const result: ProcessAppointmentPEResult = {
                appointmentId,
                success: true,
                message: 'Appointment successfully processed in Peru',
                processedAt: new Date().toISOString(),
                rdsWritten,
                eventPublished,
            };

            logger.info(`Successfully processed Peru appointment: ${appointmentId}`);
            return result;

        } catch (error) {
            logger.error(`Failed to process Peru appointment ${appointmentId}: ${error}`);

            // Return failure result instead of throwing (for SQS DLQ handling)
            return {
                appointmentId,
                success: false,
                message: `Failed to process appointment: ${error instanceof Error ? error.message : 'Unknown error'}`,
                processedAt: new Date().toISOString(),
                rdsWritten: false,
                eventPublished: false,
            };
        }
    }

    /**
     * Validate SQS message structure
     */
    private validateSQSMessage(message: AppointmentSQSMessage): void {
        const requiredFields = ['appointmentId', 'insuredId', 'scheduleId', 'countryISO'];

        for (const field of requiredFields) {
            if (!(field in message) || !message[field as keyof AppointmentSQSMessage]) {
                throw new ValidationError(
                    `Missing required field: ${field}`,
                    { message, missingField: field }
                );
            }
        }

        // Validate insured ID format
        if (!/^\d{5}$/.test(message.insuredId)) {
            throw new ValidationError(
                'Invalid insured ID format',
                { insuredId: message.insuredId }
            );
        }
    }

    /**
     * Reconstruct appointment entity from SQS message
     */
    private reconstructAppointmentFromMessage(message: AppointmentSQSMessage): Appointment {
        return Appointment.fromPersistence({
            appointmentId: message.appointmentId,
            insuredId: message.insuredId,
            scheduleId: message.scheduleId,
            countryISO: message.countryISO,
            status: message.status as 'pending' | 'completed' | 'failed',
            createdAt: new Date(message.createdAt),
            updatedAt: new Date(message.createdAt), // Will be updated after processing
            centerId: message.centerId,
            specialtyId: message.specialtyId,
            medicId: message.medicId,
            slotDatetime: message.slotDatetime ? new Date(message.slotDatetime) : undefined,
        });
    }
}
