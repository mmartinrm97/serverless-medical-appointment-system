/**
 * Appointment response DTOs
 * Data Transfer Objects for appointment responses and lists
 */

import type { AppointmentStatus, CountryISO } from '../../domain/entities/Appointment.js';

/**
 * Single appointment response DTO
 * Used for individual appointment responses
 */
export interface AppointmentResponseDto {
    appointmentId: string;
    insuredId: string;
    scheduleId: number;
    countryISO: CountryISO;
    status: AppointmentStatus;
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
    // Optional schedule details
    centerId?: number;
    specialtyId?: number;
    medicId?: number;
    slotDatetime?: string; // ISO timestamp
}

/**
 * Appointment list response DTO
 * Used for GET /appointments/{insuredId} responses
 */
export interface AppointmentListResponseDto {
    appointments: AppointmentResponseDto[];
    total: number;
    insuredId: string;
    // Optional pagination info (for future enhancement)
    page?: number;
    limit?: number;
    hasMore?: boolean;
}

/**
 * Error response DTO
 * Standardized error response format
 */
export interface ErrorResponseDto {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Convert appointment entity to response DTO
 * 
 * @param appointment - Appointment entity or props
 * @returns Formatted appointment response DTO
 * 
 * @example
 * ```typescript
 * const appointment = await repository.findById(appointmentId);
 * const responseDto = toAppointmentResponseDto(appointment.toProps());
 * ```
 */
export const toAppointmentResponseDto = (appointment: {
    appointmentId: string;
    insuredId: string;
    scheduleId: number;
    countryISO: CountryISO;
    status: AppointmentStatus;
    createdAt: Date;
    updatedAt: Date;
    centerId?: number;
    specialtyId?: number;
    medicId?: number;
    slotDatetime?: Date;
}): AppointmentResponseDto => {
    return {
        appointmentId: appointment.appointmentId,
        insuredId: appointment.insuredId,
        scheduleId: appointment.scheduleId,
        countryISO: appointment.countryISO,
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
        centerId: appointment.centerId,
        specialtyId: appointment.specialtyId,
        medicId: appointment.medicId,
        slotDatetime: appointment.slotDatetime?.toISOString(),
    };
};

/**
 * Create appointment list response DTO
 * 
 * @param appointments - Array of appointment entities/props
 * @param insuredId - Insured user identifier
 * @param pagination - Optional pagination info
 * @returns Formatted appointment list response
 * 
 * @example
 * ```typescript
 * const appointments = await repository.findByInsuredId(insuredId);
 * const listDto = createAppointmentListResponse(
 *   appointments.map(a => a.toProps()),
 *   insuredId
 * );
 * ```
 */
export const createAppointmentListResponse = (
    appointments: Array<{
        appointmentId: string;
        insuredId: string;
        scheduleId: number;
        countryISO: CountryISO;
        status: AppointmentStatus;
        createdAt: Date;
        updatedAt: Date;
        centerId?: number;
        specialtyId?: number;
        medicId?: number;
        slotDatetime?: Date;
    }>,
    insuredId: string,
    pagination?: {
        page: number;
        limit: number;
        hasMore: boolean;
    }
): AppointmentListResponseDto => {
    return {
        appointments: appointments.map(toAppointmentResponseDto),
        total: appointments.length,
        insuredId,
        page: pagination?.page,
        limit: pagination?.limit,
        hasMore: pagination?.hasMore,
    };
};

/**
 * Create standardized error response
 * 
 * @param code - Error code
 * @param message - Error message
 * @param details - Optional error details
 * @param requestId - Optional request identifier
 * @returns Formatted error response DTO
 */
export const createErrorResponse = (
    code: string,
    message: string,
    details?: Record<string, unknown>,
    requestId?: string
): ErrorResponseDto => {
    return {
        error: {
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
            requestId,
        },
    };
};
