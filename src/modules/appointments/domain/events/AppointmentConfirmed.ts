/**
 * AppointmentConfirmed domain event
 * Event published when an appointment is successfully processed in the country's RDS
 */

import type { CountryISO } from '../entities/Appointment.js';

/**
 * Appointment confirmed event data
 */
export interface AppointmentConfirmedData {
    appointmentId: string;
    insuredId: string;
    scheduleId: number;
    countryISO: CountryISO;
    processedAt: string; // ISO timestamp
    source: string; // Lambda function that processed it
}

/**
 * EventBridge event structure for appointment confirmation
 */
export interface AppointmentConfirmedEvent {
    source: 'rimac.appointment';
    'detail-type': 'AppointmentConfirmed';
    detail: AppointmentConfirmedData;
}

/**
 * Create an AppointmentConfirmed event
 * 
 * @param data - Event data
 * @returns EventBridge compatible event
 * 
 * @example
 * ```typescript
 * const event = createAppointmentConfirmedEvent({
 *   appointmentId: "01H0000000000000000000",
 *   insuredId: "12345",
 *   scheduleId: 100,
 *   countryISO: "PE",
 *   source: "appointment_pe"
 * });
 * ```
 */
export const createAppointmentConfirmedEvent = (data: {
    appointmentId: string;
    insuredId: string;
    scheduleId: number;
    countryISO: CountryISO;
    source: string;
}): AppointmentConfirmedEvent => {
    return {
        source: 'rimac.appointment',
        'detail-type': 'AppointmentConfirmed',
        detail: {
            appointmentId: data.appointmentId,
            insuredId: data.insuredId,
            scheduleId: data.scheduleId,
            countryISO: data.countryISO,
            processedAt: new Date().toISOString(),
            source: data.source,
        },
    };
};

/**
 * Type guard to check if an event is AppointmentConfirmed
 * 
 * @param event - Event to check
 * @returns True if event is AppointmentConfirmed
 */
export const isAppointmentConfirmedEvent = (
    event: unknown
): event is AppointmentConfirmedEvent => {
    return (
        typeof event === 'object' &&
        event !== null &&
        'source' in event &&
        'detail-type' in event &&
        'detail' in event &&
        (event as AppointmentConfirmedEvent).source === 'rimac.appointment' &&
        (event as AppointmentConfirmedEvent)['detail-type'] === 'AppointmentConfirmed'
    );
};

/**
 * Validate AppointmentConfirmed event data
 * 
 * @param data - Event data to validate
 * @throws ValidationError if data is invalid
 */
export const validateAppointmentConfirmedData = (
    data: unknown
): data is AppointmentConfirmedData => {
    if (typeof data !== 'object' || data === null) {
        return false;
    }

    const eventData = data as Record<string, unknown>;

    return (
        typeof eventData.appointmentId === 'string' &&
        typeof eventData.insuredId === 'string' &&
        typeof eventData.scheduleId === 'number' &&
        typeof eventData.countryISO === 'string' &&
        ['PE', 'CL'].includes(eventData.countryISO) &&
        typeof eventData.processedAt === 'string' &&
        typeof eventData.source === 'string'
    );
};
