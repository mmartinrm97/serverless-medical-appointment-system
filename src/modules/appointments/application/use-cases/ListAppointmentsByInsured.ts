/**
 * List Appointments By Insured Use Case
 * Handles retrieving all appointments for a specific insured user
 */

import type { IAppointmentsRepository } from '../../domain/repositories/IAppointmentsRepository.js';
import { AppointmentValidator } from '../../domain/validators/AppointmentValidator.js';
import type { AppointmentListResponseDto } from '../dtos/AppointmentResponseDto.js';
import { createAppointmentListResponse } from '../dtos/AppointmentResponseDto.js';

import { logger } from '@/shared/infrastructure/logging/logger.js';

/**
 * Use Case for listing appointments by insured user
 *
 * This Use Case orchestrates the following steps:
 * 1. Validate insured ID format
 * 2. Query appointments from DynamoDB
 * 3. Map results to response DTOs
 * 4. Return formatted list response
 */
export class ListAppointmentsByInsured {
  constructor(
    private readonly appointmentsRepository: IAppointmentsRepository
  ) {}

  /**
   * Execute the list appointments use case
   *
   * @param insuredId - 5-digit insured user identifier
   * @returns Promise with appointments list response
   * @throws ValidationError if insuredId format is invalid
   * @throws NotFoundError if no appointments found (optional behavior)
   *
   * @example
   * ```typescript
   * const useCase = new ListAppointmentsByInsured(repository);
   * const response = await useCase.execute("12345");
   * ```
   */
  public async execute(insuredId: string): Promise<AppointmentListResponseDto> {
    logger.info(`Listing appointments for insured: ${insuredId}`);

    try {
      // Step 1: Validate insured ID format
      AppointmentValidator.validateInsuredId(insuredId);

      // Step 2: Query appointments from repository
      const appointments =
        await this.appointmentsRepository.findByInsuredId(insuredId);

      logger.info(
        `Found ${appointments.length} appointments for insured: ${insuredId}`
      );

      // Step 3: Convert entities to DTOs and create response
      const appointmentProps = appointments.map(appointment =>
        appointment.toProps()
      );

      const response = createAppointmentListResponse(
        appointmentProps,
        insuredId
      );

      // Optional: Log summary by status
      const statusCounts = appointmentProps.reduce(
        (acc, appointment) => {
          acc[appointment.status] = (acc[appointment.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      logger.info(
        `Appointment status summary for ${insuredId}: ${JSON.stringify(statusCounts)}`
      );

      return response;
    } catch (error) {
      logger.error(
        `Failed to list appointments for insured ${insuredId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Execute with pagination support (for future enhancement)
   *
   * @param insuredId - 5-digit insured user identifier
   * @param options - Pagination options
   * @returns Promise with paginated appointments list
   */
  public async executeWithPagination(
    insuredId: string,
    options: {
      page?: number;
      limit?: number;
      status?: 'pending' | 'completed' | 'failed';
    } = {}
  ): Promise<AppointmentListResponseDto> {
    logger.info(
      `Listing appointments with pagination for insured: ${insuredId} - options: ${JSON.stringify(options)}`
    );

    try {
      // Step 1: Validate insured ID
      AppointmentValidator.validateInsuredId(insuredId);

      // Step 2: Get all appointments (in real implementation, this would be paginated at DB level)
      const allAppointments =
        await this.appointmentsRepository.findByInsuredId(insuredId);

      // Step 3: Apply client-side filtering and pagination (temporary solution)
      let filteredAppointments = allAppointments;

      // Filter by status if provided
      if (options.status) {
        filteredAppointments = allAppointments.filter(
          appointment => appointment.status === options.status
        );
      }

      // Apply pagination
      const page = options.page ?? 1;
      const limit = options.limit ?? 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedAppointments = filteredAppointments.slice(
        startIndex,
        endIndex
      );
      const hasMore = endIndex < filteredAppointments.length;

      logger.info(
        `Returning page ${page} with ${paginatedAppointments.length} appointments`
      );

      // Step 4: Create response with pagination info
      const appointmentProps = paginatedAppointments.map(appointment =>
        appointment.toProps()
      );

      return createAppointmentListResponse(appointmentProps, insuredId, {
        page,
        limit,
        hasMore,
      });
    } catch (error) {
      logger.error(
        `Failed to list appointments with pagination for insured ${insuredId}: ${error}`
      );
      throw error;
    }
  }
}
