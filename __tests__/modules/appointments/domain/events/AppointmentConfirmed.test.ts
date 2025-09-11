import { describe, it, expect } from 'vitest';
import {
    createAppointmentConfirmedEvent,
    isAppointmentConfirmedEvent,
    validateAppointmentConfirmedData,
    type AppointmentConfirmedData
} from '@/modules/appointments/domain/events/AppointmentConfirmed.js';
import { type CountryISO } from '@/modules/appointments/domain/entities/Appointment.js';

describe('AppointmentConfirmed Domain Event', () => {
    const validEventData = {
        appointmentId: '01HKNEX123456789ABCDEFGHIJ',
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE' as CountryISO,
        source: 'appointment_pe'
    };

    describe('createAppointmentConfirmedEvent()', () => {
        it('should create a valid AppointmentConfirmed event', () => {
            const event = createAppointmentConfirmedEvent(validEventData);

            expect(event).toEqual({
                source: 'rimac.appointment',
                'detail-type': 'AppointmentConfirmed',
                detail: {
                    appointmentId: validEventData.appointmentId,
                    insuredId: validEventData.insuredId,
                    scheduleId: validEventData.scheduleId,
                    countryISO: validEventData.countryISO,
                    processedAt: expect.any(String),
                    source: validEventData.source
                }
            });
        });

        it('should generate processedAt timestamp', () => {
            const beforeCreate = new Date();
            const event = createAppointmentConfirmedEvent(validEventData);
            const afterCreate = new Date();

            const processedAt = new Date(event.detail.processedAt);
            expect(processedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
            expect(processedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        });

        it('should include all provided data in detail', () => {
            const event = createAppointmentConfirmedEvent(validEventData);

            expect(event.detail.appointmentId).toBe(validEventData.appointmentId);
            expect(event.detail.insuredId).toBe(validEventData.insuredId);
            expect(event.detail.scheduleId).toBe(validEventData.scheduleId);
            expect(event.detail.countryISO).toBe(validEventData.countryISO);
            expect(event.detail.source).toBe(validEventData.source);
        });

        it('should work with Chile country ISO', () => {
            const chileData = {
                ...validEventData,
                countryISO: 'CL' as CountryISO,
                source: 'appointment_cl'
            };

            const event = createAppointmentConfirmedEvent(chileData);

            expect(event.detail.countryISO).toBe('CL');
            expect(event.detail.source).toBe('appointment_cl');
        });
    });

    describe('isAppointmentConfirmedEvent()', () => {
        it('should return true for valid AppointmentConfirmed event', () => {
            const event = createAppointmentConfirmedEvent(validEventData);

            expect(isAppointmentConfirmedEvent(event)).toBe(true);
        });

        it('should return false for null or undefined', () => {
            expect(isAppointmentConfirmedEvent(null)).toBe(false);
            expect(isAppointmentConfirmedEvent(undefined)).toBe(false);
        });

        it('should return false for non-object values', () => {
            expect(isAppointmentConfirmedEvent('string')).toBe(false);
            expect(isAppointmentConfirmedEvent(123)).toBe(false);
            expect(isAppointmentConfirmedEvent(true)).toBe(false);
        });

        it('should return false for object without required properties', () => {
            expect(isAppointmentConfirmedEvent({})).toBe(false);
            expect(isAppointmentConfirmedEvent({ source: 'rimac.appointment' })).toBe(false);
            expect(isAppointmentConfirmedEvent({ 'detail-type': 'AppointmentConfirmed' })).toBe(false);
        });

        it('should return false for event with wrong source', () => {
            const invalidEvent = {
                source: 'wrong.source',
                'detail-type': 'AppointmentConfirmed',
                detail: {}
            };

            expect(isAppointmentConfirmedEvent(invalidEvent)).toBe(false);
        });

        it('should return false for event with wrong detail-type', () => {
            const invalidEvent = {
                source: 'rimac.appointment',
                'detail-type': 'WrongEventType',
                detail: {}
            };

            expect(isAppointmentConfirmedEvent(invalidEvent)).toBe(false);
        });
    });

    describe('validateAppointmentConfirmedData()', () => {
        const validData: AppointmentConfirmedData = {
            appointmentId: '01HKNEX123456789ABCDEFGHIJ',
            insuredId: '12345',
            scheduleId: 100,
            countryISO: 'PE',
            processedAt: '2024-01-10T08:00:00.000Z',
            source: 'appointment_pe'
        };

        it('should return true for valid event data', () => {
            expect(validateAppointmentConfirmedData(validData)).toBe(true);
        });

        it('should return false for null or undefined', () => {
            expect(validateAppointmentConfirmedData(null)).toBe(false);
            expect(validateAppointmentConfirmedData(undefined)).toBe(false);
        });

        it('should return false for non-object values', () => {
            expect(validateAppointmentConfirmedData('string')).toBe(false);
            expect(validateAppointmentConfirmedData(123)).toBe(false);
            expect(validateAppointmentConfirmedData(true)).toBe(false);
        });

        it('should return false for missing appointmentId', () => {
            const invalidData = { ...validData };
            delete (invalidData as any).appointmentId;

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for non-string appointmentId', () => {
            const invalidData = { ...validData, appointmentId: 123 };

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for missing insuredId', () => {
            const invalidData = { ...validData };
            delete (invalidData as any).insuredId;

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for non-string insuredId', () => {
            const invalidData = { ...validData, insuredId: 123 };

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for missing scheduleId', () => {
            const invalidData = { ...validData };
            delete (invalidData as any).scheduleId;

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for non-number scheduleId', () => {
            const invalidData = { ...validData, scheduleId: '100' };

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for invalid countryISO', () => {
            const invalidData = { ...validData, countryISO: 'US' };

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for missing processedAt', () => {
            const invalidData = { ...validData };
            delete (invalidData as any).processedAt;

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for non-string processedAt', () => {
            const invalidData = { ...validData, processedAt: new Date() };

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for missing source', () => {
            const invalidData = { ...validData };
            delete (invalidData as any).source;

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should return false for non-string source', () => {
            const invalidData = { ...validData, source: 123 };

            expect(validateAppointmentConfirmedData(invalidData)).toBe(false);
        });

        it('should validate Chile country data correctly', () => {
            const chileData = { ...validData, countryISO: 'CL' };

            expect(validateAppointmentConfirmedData(chileData)).toBe(true);
        });
    });

    describe('Event Integration', () => {
        it('should create event that passes validation', () => {
            const event = createAppointmentConfirmedEvent(validEventData);

            expect(isAppointmentConfirmedEvent(event)).toBe(true);
            expect(validateAppointmentConfirmedData(event.detail)).toBe(true);
        });

        it('should create consistent events with same input', () => {
            const event1 = createAppointmentConfirmedEvent(validEventData);
            const event2 = createAppointmentConfirmedEvent(validEventData);

            // Same structure, different timestamps
            expect(event1.source).toBe(event2.source);
            expect(event1['detail-type']).toBe(event2['detail-type']);
            expect(event1.detail.appointmentId).toBe(event2.detail.appointmentId);
            expect(event1.detail.insuredId).toBe(event2.detail.insuredId);
            expect(event1.detail.scheduleId).toBe(event2.detail.scheduleId);
            expect(event1.detail.countryISO).toBe(event2.detail.countryISO);
            expect(event1.detail.source).toBe(event2.detail.source);
        });
    });
});
