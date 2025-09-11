/**
 * Create Appointment Use Case
 * Handles the business logic for creating new medical appointments
 */

import { Appointment } from '../../domain/entities/Appointment.js';
import type { IAppointmentsRepository } from '../../domain/repositories/IAppointmentsRepository.js';
import type { IEventPublisher } from '../../domain/services/IEventPublisher.js';
import { AppointmentValidator } from '../../domain/validators/AppointmentValidator.js';
import type {
  CreateAppointmentRequest,
  CreateAppointmentResponse,
} from '../dtos/CreateAppointmentDto.js';
import { createAppointmentSuccessResponse } from '../dtos/CreateAppointmentDto.js';
import { InfrastructureError } from '@/shared/domain/errors/index.js';
import { logger } from '@/shared/infrastructure/logging/logger.js';

/**
 * Use Case for creating new appointments
 *
 * This Use Case orchestrates the following steps:
 * 1. Validate input data
 * 2. Check for duplicate appointments (idempotency)
 * 3. Create appointment entity
 * 4. Save to DynamoDB with "pending" status
 * 5. Publish message to SNS for country processing
 * 6. Return response DTO
 */
export class CreateAppointment {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository,
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Execute the create appointment use case
   *
   * @param request - Validated appointment creation request
   * @returns Promise with appointment creation response
   * @throws ConflictError if appointment already exists
   * @throws InfrastructureError if save or publish fails
   *
   * @example
   * ```typescript
   * const useCase = new CreateAppointment(repository, publisher);
   * const response = await useCase.execute({
   *   insuredId: "12345",
   *   scheduleId: 100,
   *   countryISO: "PE"
   * });
   * ```
   */
  public async execute(
    request: CreateAppointmentRequest
  ): Promise<CreateAppointmentResponse> {
    logger.info(
      `Creating appointment for insured ${request.insuredId}, schedule ${request.scheduleId}`
    );

    try {
      // Step 1: Validate the request data
      AppointmentValidator.validateAppointmentData({
        insuredId: request.insuredId,
        scheduleId: request.scheduleId,
        countryISO: request.countryISO,
      });

      // Step 2: Check for existing appointment (idempotency)
      const existingAppointment =
        await this.appointmentsRepository.findByInsuredAndSchedule(
          request.insuredId,
          request.scheduleId
        );

      if (existingAppointment) {
        logger.info(
          `Duplicate appointment found for insured ${request.insuredId}, schedule ${request.scheduleId}`
        );

        // Return existing appointment instead of creating duplicate
        return createAppointmentSuccessResponse({
          appointmentId: existingAppointment.appointmentId,
          insuredId: existingAppointment.insuredId,
          scheduleId: existingAppointment.scheduleId,
          countryISO: existingAppointment.countryISO,
          createdAt: existingAppointment.createdAt,
        });
      }

      // Step 3: Create new appointment entity
      const appointment = Appointment.create({
        insuredId: request.insuredId,
        scheduleId: request.scheduleId,
        countryISO: request.countryISO,
        centerId: request.centerId,
        specialtyId: request.specialtyId,
        medicId: request.medicId,
        slotDatetime: request.slotDatetime,
      });

      logger.info(
        `Created appointment entity with ID: ${appointment.appointmentId}`
      );

      // Step 4: Save appointment to DynamoDB (status: "pending")
      try {
        await this.appointmentsRepository.save(appointment);
        logger.info(
          `Saved appointment to DynamoDB: ${appointment.appointmentId}`
        );
      } catch (error) {
        logger.error(`Failed to save appointment to DynamoDB: ${error}`);
        throw new InfrastructureError(
          'appointment save',
          'Failed to save appointment to database',
          { appointmentId: appointment.appointmentId, error }
        );
      }

      // Step 5: Publish message to SNS for country processing
      try {
        await this.publishAppointmentMessage(appointment);
        logger.info(
          `Published SNS message for appointment: ${appointment.appointmentId}`
        );
      } catch (error) {
        logger.error(`Failed to publish SNS message: ${error}`);
        // Note: In a production system, you might want to implement compensation
        // For now, we'll throw but the appointment is already saved
        throw new InfrastructureError(
          'SNS publish',
          'Failed to publish appointment message',
          { appointmentId: appointment.appointmentId, error }
        );
      }

      // Step 6: Return success response
      const response = createAppointmentSuccessResponse({
        appointmentId: appointment.appointmentId,
        insuredId: appointment.insuredId,
        scheduleId: appointment.scheduleId,
        countryISO: appointment.countryISO,
        createdAt: appointment.createdAt,
      });

      logger.info(
        `Successfully created appointment: ${appointment.appointmentId}`
      );
      return response;
    } catch (error) {
      logger.error(
        `Create appointment failed for insured ${request.insuredId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Publish appointment message to SNS
   * The message will be filtered to the appropriate country SQS queue
   *
   * @param appointment - Appointment entity to publish
   */
  private async publishAppointmentMessage(
    appointment: Appointment
  ): Promise<void> {
    // Create SNS message with message attributes for filtering
    const messageData = {
      source: 'appointments.api',
      detailType: 'AppointmentCreated',
      detail: {
        appointmentId: appointment.appointmentId,
        insuredId: appointment.insuredId,
        scheduleId: appointment.scheduleId,
        countryISO: appointment.countryISO,
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
        centerId: appointment.centerId,
        specialtyId: appointment.specialtyId,
        medicId: appointment.medicId,
        slotDatetime: appointment.slotDatetime?.toISOString(),
      },
    };

    // Publish to SNS - the infrastructure layer will handle the actual SNS call
    await this.eventPublisher.publishEvent(messageData);
  }
}
