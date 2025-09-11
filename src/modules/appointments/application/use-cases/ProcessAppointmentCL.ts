/**
 * Process Appointment CL Use Case
 * Handles appointment processing specifically for Chile
 */

import { Appointment } from '../../domain/entities/Appointment.js';
import { CountryStrategyFactory } from '../../domain/services/CountryStrategyFactory.js';
import type { IEventPublisher } from '../../domain/services/IEventPublisher.js';
import { createAppointmentConfirmedEvent } from '../../domain/events/AppointmentConfirmed.js';
import {
  ValidationError,
  InfrastructureError,
} from '@/shared/domain/errors/index.js';
import { logger } from '@/shared/infrastructure/logging/logger.js';

/**
 * SQS message structure for Chile appointment processing
 */
export interface AppointmentCLSQSMessage {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: 'CL';
  status: string;
  createdAt: string;
  centerId?: number;
  specialtyId?: number;
  medicId?: number;
  slotDatetime?: string;
}

/**
 * Result of Chile appointment processing
 */
export interface ProcessAppointmentCLResult {
  appointmentId: string;
  success: boolean;
  message: string;
  processedAt: string;
  rdsWritten: boolean;
  eventPublished: boolean;
}

/**
 * Use Case for processing appointments in Chile
 *
 * Similar to Peru processor but with Chile-specific logic
 */
export class ProcessAppointmentCL {
  constructor(private readonly eventPublisher: IEventPublisher) {}

  /**
   * Execute Chile appointment processing from SQS message
   */
  public async execute(
    sqsMessage: AppointmentCLSQSMessage
  ): Promise<ProcessAppointmentCLResult> {
    const { appointmentId, countryISO } = sqsMessage;

    logger.info(`Processing Chile appointment: ${appointmentId}`);

    try {
      // Step 1: Validate message and country
      this.validateSQSMessage(sqsMessage);

      if (countryISO !== 'CL') {
        throw new ValidationError('Invalid country for Chile processor', {
          appointmentId,
          countryISO,
        });
      }

      // Step 2: Reconstruct appointment entity
      const appointment = this.reconstructAppointmentFromMessage(sqsMessage);

      // Step 3: Use Chile strategy to process appointment
      let rdsWritten = false;
      try {
        const chileStrategy = CountryStrategyFactory.create('CL');
        const processResult =
          await chileStrategy.processAppointment(appointment);

        if (!processResult.success) {
          throw new InfrastructureError(
            'Chile RDS write',
            processResult.message,
            { appointmentId, processResult }
          );
        }

        rdsWritten = true;
        logger.info(
          `Successfully wrote appointment ${appointmentId} to Chile RDS`
        );
      } catch (error) {
        logger.error(
          `Failed to write appointment ${appointmentId} to Chile RDS: ${error}`
        );
        throw new InfrastructureError(
          'Chile RDS write',
          `Failed to write appointment to Chile database: ${error}`,
          { appointmentId, error }
        );
      }

      // Step 4: Publish confirmation event
      let eventPublished = false;
      try {
        const confirmationEvent = createAppointmentConfirmedEvent({
          appointmentId,
          insuredId: sqsMessage.insuredId,
          scheduleId: sqsMessage.scheduleId,
          countryISO: 'CL',
          source: 'appointment_cl',
        });

        await this.eventPublisher.publishAppointmentConfirmed(
          confirmationEvent
        );
        eventPublished = true;
        logger.info(
          `Published confirmation event for appointment ${appointmentId}`
        );
      } catch (error) {
        logger.error(
          `Failed to publish confirmation event for ${appointmentId}: ${error}`
        );
        throw new InfrastructureError(
          'EventBridge publish',
          `Failed to publish confirmation event: ${error}`,
          { appointmentId, error }
        );
      }

      // Step 5: Return success result
      const result: ProcessAppointmentCLResult = {
        appointmentId,
        success: true,
        message: 'Appointment successfully processed in Chile',
        processedAt: new Date().toISOString(),
        rdsWritten,
        eventPublished,
      };

      logger.info(`Successfully processed Chile appointment: ${appointmentId}`);
      return result;
    } catch (error) {
      logger.error(
        `Failed to process Chile appointment ${appointmentId}: ${error}`
      );

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

  private validateSQSMessage(message: AppointmentCLSQSMessage): void {
    const requiredFields = [
      'appointmentId',
      'insuredId',
      'scheduleId',
      'countryISO',
    ];

    for (const field of requiredFields) {
      if (
        !(field in message) ||
        !message[field as keyof AppointmentCLSQSMessage]
      ) {
        throw new ValidationError(`Missing required field: ${field}`, {
          message,
          missingField: field,
        });
      }
    }

    if (!/^\d{5}$/.test(message.insuredId)) {
      throw new ValidationError('Invalid insured ID format', {
        insuredId: message.insuredId,
      });
    }
  }

  private reconstructAppointmentFromMessage(
    message: AppointmentCLSQSMessage
  ): Appointment {
    return Appointment.fromPersistence({
      appointmentId: message.appointmentId,
      insuredId: message.insuredId,
      scheduleId: message.scheduleId,
      countryISO: message.countryISO,
      status: message.status as 'pending' | 'completed' | 'failed',
      createdAt: new Date(message.createdAt),
      updatedAt: new Date(message.createdAt),
      centerId: message.centerId,
      specialtyId: message.specialtyId,
      medicId: message.medicId,
      slotDatetime: message.slotDatetime
        ? new Date(message.slotDatetime)
        : undefined,
    });
  }
}
