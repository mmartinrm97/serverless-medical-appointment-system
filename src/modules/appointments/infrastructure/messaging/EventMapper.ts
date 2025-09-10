import type { AppointmentConfirmedEvent } from '../../domain/events/AppointmentConfirmed.js';

/**
 * EventBridge event structure for appointment events.
 * 
 * Represents the standardized format for events published to EventBridge.
 */
export interface EventBridgeEvent {
    source: string;
    detailType: string;
    detail: Record<string, unknown>;
}

/**
 * Mapper class for converting domain events to EventBridge format.
 * 
 * Transforms domain events into the standardized EventBridge event structure
 * that can be consumed by downstream services and Lambda functions.
 */
export class EventMapper {

    /**
     * Converts an AppointmentConfirmedEvent to EventBridge format.
     * 
     * @param event - The domain event to convert
     * @returns EventBridge-formatted event
     */
    toEventBridgeEvent(event: AppointmentConfirmedEvent): EventBridgeEvent {
        return {
            source: event.source,
            detailType: event['detail-type'],
            detail: {
                appointmentId: event.detail.appointmentId,
                insuredId: event.detail.insuredId,
                scheduleId: event.detail.scheduleId,
                countryISO: event.detail.countryISO,
                processedAt: event.detail.processedAt,
                source: event.detail.source,
            },
        };
    }

    /**
     * Creates a generic appointment event for EventBridge.
     * 
     * @param eventType - Type of the event (e.g., 'AppointmentCreated', 'AppointmentFailed')
     * @param appointmentData - Appointment data to include in event
     * @returns EventBridge-formatted event
     */
    createAppointmentEvent(
        eventType: string,
        appointmentData: {
            appointmentId: string;
            insuredId: string;
            scheduleId: number;
            countryISO: 'PE' | 'CL';
            [key: string]: unknown;
        }
    ): EventBridgeEvent {
        return {
            source: 'rimac.appointments',
            detailType: eventType,
            detail: {
                ...appointmentData,
                eventTime: new Date().toISOString(),
            },
        };
    }

    /**
     * Validates that an event has all required fields for EventBridge.
     * 
     * @param event - The event to validate
     * @returns True if valid, false otherwise
     */
    isValidEvent(event: unknown): event is EventBridgeEvent {
        return !!(
            event &&
            typeof event === 'object' &&
            'source' in event &&
            'detailType' in event &&
            'detail' in event &&
            typeof (event as EventBridgeEvent).source === 'string' &&
            typeof (event as EventBridgeEvent).detailType === 'string' &&
            typeof (event as EventBridgeEvent).detail === 'object'
        );
    }
}
