/**
 * Appointment Application Service
 * Orchestrates Use Cases and provides a unified interface for the appointment module
 */

import type { IAppointmentsRepository } from '../../domain/repositories/IAppointmentsRepository.js';
import type { IEventPublisher } from '../../domain/services/IEventPublisher.js';
import { CreateAppointment } from '../use-cases/CreateAppointment.js';
import { ListAppointmentsByInsured } from '../use-cases/ListAppointmentsByInsured.js';
import { ConfirmAppointment } from '../use-cases/ConfirmAppointment.js';
import { ProcessAppointmentPE } from '../use-cases/ProcessAppointmentPE.js';
import { ProcessAppointmentCL } from '../use-cases/ProcessAppointmentCL.js';
import type { CreateAppointmentRequest, CreateAppointmentResponse } from '../dtos/CreateAppointmentDto.js';
import type { AppointmentListResponseDto } from '../dtos/AppointmentResponseDto.js';
import type { ConfirmAppointmentResult } from '../use-cases/ConfirmAppointment.js';
import type { ProcessAppointmentPEResult, AppointmentSQSMessage } from '../use-cases/ProcessAppointmentPE.js';
import type { ProcessAppointmentCLResult, AppointmentCLSQSMessage } from '../use-cases/ProcessAppointmentCL.js';
import { logger } from '@/shared/infrastructure/logging/logger.js';

/**
 * Dependency injection container for the appointment service
 */
export interface AppointmentServiceDependencies {
    appointmentsRepository: IAppointmentsRepository;
    eventPublisher: IEventPublisher;
}

/**
 * Main application service for appointments
 * 
 * This service provides a unified interface for all appointment operations
 * and handles dependency injection for Use Cases
 * 
 * @example
 * ```typescript
 * const service = new AppointmentService({
 *   appointmentsRepository: new DdbAppointmentsRepository(),
 *   eventPublisher: new EventBridgePublisher()
 * });
 * 
 * const response = await service.createAppointment(requestData);
 * ```
 */
export class AppointmentService {
    // Use Case instances (lazy-loaded)
    private createAppointmentUseCase?: CreateAppointment;
    private listAppointmentsByInsuredUseCase?: ListAppointmentsByInsured;
    private confirmAppointmentUseCase?: ConfirmAppointment;
    private processAppointmentPEUseCase?: ProcessAppointmentPE;
    private processAppointmentCLUseCase?: ProcessAppointmentCL;

    constructor(
        private readonly dependencies: AppointmentServiceDependencies
    ) {
        logger.info('AppointmentService initialized');
    }

    /**
     * Create a new appointment
     * 
     * @param request - Appointment creation request
     * @returns Promise with appointment creation response
     */
    public async createAppointment(request: CreateAppointmentRequest): Promise<CreateAppointmentResponse> {
        const useCase = this.getCreateAppointmentUseCase();
        return useCase.execute(request);
    }

    /**
     * List appointments for an insured user
     * 
     * @param insuredId - 5-digit insured user identifier
     * @returns Promise with appointments list
     */
    public async listAppointmentsByInsured(insuredId: string): Promise<AppointmentListResponseDto> {
        const useCase = this.getListAppointmentsByInsuredUseCase();
        return useCase.execute(insuredId);
    }

    /**
     * List appointments with pagination
     * 
     * @param insuredId - 5-digit insured user identifier
     * @param options - Pagination and filtering options
     * @returns Promise with paginated appointments list
     */
    public async listAppointmentsByInsuredWithPagination(
        insuredId: string,
        options: {
            page?: number;
            limit?: number;
            status?: 'pending' | 'completed' | 'failed';
        } = {}
    ): Promise<AppointmentListResponseDto> {
        const useCase = this.getListAppointmentsByInsuredUseCase();
        return useCase.executeWithPagination(insuredId, options);
    }

    /**
     * Confirm appointment from EventBridge event
     * 
     * @param event - AppointmentConfirmed event
     * @returns Promise with confirmation result
     */
    public async confirmAppointmentFromEvent(event: unknown): Promise<ConfirmAppointmentResult> {
        const useCase = this.getConfirmAppointmentUseCase();
        return useCase.executeFromEvent(event);
    }

    /**
     * Confirm appointment with validated data
     * 
     * @param confirmationData - Validated confirmation data
     * @returns Promise with confirmation result  
     */
    public async confirmAppointment(confirmationData: {
        appointmentId: string;
        insuredId: string;
        scheduleId: number;
        countryISO: string;
        processedAt: string;
        source: string;
    }): Promise<ConfirmAppointmentResult> {
        const useCase = this.getConfirmAppointmentUseCase();
        return useCase.execute(confirmationData);
    }

    /**
     * Process appointment for Peru
     * 
     * @param sqsMessage - SQS message with appointment data
     * @returns Promise with processing result
     */
    public async processAppointmentPE(sqsMessage: AppointmentSQSMessage): Promise<ProcessAppointmentPEResult> {
        const useCase = this.getProcessAppointmentPEUseCase();
        return useCase.execute(sqsMessage);
    }

    /**
     * Process appointment for Chile
     * 
     * @param sqsMessage - SQS message with appointment data
     * @returns Promise with processing result
     */
    public async processAppointmentCL(sqsMessage: AppointmentCLSQSMessage): Promise<ProcessAppointmentCLResult> {
        const useCase = this.getProcessAppointmentCLUseCase();
        return useCase.execute(sqsMessage);
    }

    // Lazy-loaded Use Case getters (Dependency Injection)

    private getCreateAppointmentUseCase(): CreateAppointment {
        this.createAppointmentUseCase ??= new CreateAppointment(
            this.dependencies.appointmentsRepository,
            this.dependencies.eventPublisher
        );
        return this.createAppointmentUseCase;
    }

    private getListAppointmentsByInsuredUseCase(): ListAppointmentsByInsured {
        this.listAppointmentsByInsuredUseCase ??= new ListAppointmentsByInsured(
            this.dependencies.appointmentsRepository
        );
        return this.listAppointmentsByInsuredUseCase;
    }

    private getConfirmAppointmentUseCase(): ConfirmAppointment {
        this.confirmAppointmentUseCase ??= new ConfirmAppointment(
            this.dependencies.appointmentsRepository
        );
        return this.confirmAppointmentUseCase;
    }

    private getProcessAppointmentPEUseCase(): ProcessAppointmentPE {
        this.processAppointmentPEUseCase ??= new ProcessAppointmentPE(
            this.dependencies.eventPublisher
        );
        return this.processAppointmentPEUseCase;
    }

    private getProcessAppointmentCLUseCase(): ProcessAppointmentCL {
        this.processAppointmentCLUseCase ??= new ProcessAppointmentCL(
            this.dependencies.eventPublisher
        );
        return this.processAppointmentCLUseCase;
    }
}
