import { describe, it, expect, beforeEach } from 'vitest';
import { Appointment, type CountryISO } from '@/modules/appointments/domain/entities/Appointment.js';
import { DomainError, ValidationError } from '@/shared/domain/errors/index.js';

describe('Appointment Entity', () => {
    const validAppointmentData = {
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE' as CountryISO,
        centerId: 1,
        specialtyId: 10,
        medicId: 20,
        slotDatetime: new Date('2024-01-15T10:00:00Z')
    };

    describe('create()', () => {
        it('should create a new appointment with valid data', () => {
            const appointment = Appointment.create(validAppointmentData);

            expect(appointment.insuredId).toBe('12345');
            expect(appointment.scheduleId).toBe(100);
            expect(appointment.countryISO).toBe('PE');
            expect(appointment.status).toBe('pending');
            expect(appointment.centerId).toBe(1);
            expect(appointment.specialtyId).toBe(10);
            expect(appointment.medicId).toBe(20);
            expect(appointment.slotDatetime).toEqual(validAppointmentData.slotDatetime);
            expect(appointment.appointmentId).toBeDefined();
            expect(appointment.createdAt).toBeInstanceOf(Date);
            expect(appointment.updatedAt).toBeInstanceOf(Date);
        });

        it('should create appointment with minimal required data', () => {
            const minimalData = {
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO
            };

            const appointment = Appointment.create(minimalData);

            expect(appointment.insuredId).toBe('12345');
            expect(appointment.scheduleId).toBe(100);
            expect(appointment.countryISO).toBe('PE');
            expect(appointment.status).toBe('pending');
            expect(appointment.centerId).toBeUndefined();
            expect(appointment.specialtyId).toBeUndefined();
            expect(appointment.medicId).toBeUndefined();
            expect(appointment.slotDatetime).toBeUndefined();
        });

        it('should generate appointment IDs (mocked as same in test env)', () => {
            // In test environment, ULID is mocked to return same value
            // In real environment, ULIDs would be unique
            const appointment1 = Appointment.create(validAppointmentData);
            const appointment2 = Appointment.create(validAppointmentData);

            expect(appointment1.appointmentId).toBeDefined();
            expect(appointment2.appointmentId).toBeDefined();
            expect(typeof appointment1.appointmentId).toBe('string');
        }); it('should throw ValidationError for invalid insured ID', () => {
            const invalidData = {
                ...validAppointmentData,
                insuredId: '123' // Invalid - not 5 digits
            };

            expect(() => Appointment.create(invalidData)).toThrow(ValidationError);
            expect(() => Appointment.create(invalidData)).toThrow('Insured ID must be exactly 5 digits');
        });

        it('should throw ValidationError for invalid schedule ID', () => {
            const invalidData = {
                ...validAppointmentData,
                scheduleId: 0 // Invalid - not positive
            };

            expect(() => Appointment.create(invalidData)).toThrow(ValidationError);
            expect(() => Appointment.create(invalidData)).toThrow('Schedule ID must be a positive number');
        });

        it('should throw ValidationError for invalid country ISO', () => {
            const invalidData = {
                ...validAppointmentData,
                countryISO: 'US' as CountryISO // Invalid - not PE or CL
            };

            expect(() => Appointment.create(invalidData)).toThrow(ValidationError);
            expect(() => Appointment.create(invalidData)).toThrow('Country ISO must be PE or CL');
        });
    });

    describe('fromPersistence()', () => {
        it('should reconstruct appointment from complete persistence data', () => {
            const persistenceData = {
                appointmentId: '01234567890123456789012345', // Use the mocked ULID from setup.ts
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                status: 'completed' as const,
                createdAt: new Date('2024-01-10T08:00:00Z'),
                updatedAt: new Date('2024-01-11T10:00:00Z'),
                centerId: 1,
                specialtyId: 10,
                medicId: 20,
                slotDatetime: new Date('2024-01-15T10:00:00Z')
            };

            const appointment = Appointment.fromPersistence(persistenceData);

            expect(appointment.appointmentId).toBe('01234567890123456789012345');
            expect(appointment.insuredId).toBe('12345');
            expect(appointment.status).toBe('completed');
            expect(appointment.createdAt).toEqual(persistenceData.createdAt);
            expect(appointment.updatedAt).toEqual(persistenceData.updatedAt);
        }); it('should throw ValidationError for invalid appointment ID format', () => {
            const invalidData = {
                appointmentId: 'invalid-id',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                status: 'pending' as const,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(() => Appointment.fromPersistence(invalidData)).toThrow(ValidationError);
            expect(() => Appointment.fromPersistence(invalidData)).toThrow('Invalid appointment ID format');
        });
    });

    describe('Status Management', () => {
        let appointment: Appointment;

        beforeEach(() => {
            appointment = Appointment.create(validAppointmentData);
        });

        it('should mark pending appointment as completed', () => {
            expect(appointment.status).toBe('pending');

            const completedAppointment = appointment.markAsCompleted();

            expect(completedAppointment.status).toBe('completed');
            expect(completedAppointment.appointmentId).toBe(appointment.appointmentId);
            expect(completedAppointment.updatedAt.getTime()).toBeGreaterThanOrEqual(appointment.updatedAt.getTime());
        });

        it('should throw DomainError when completing already completed appointment', () => {
            const completedAppointment = appointment.markAsCompleted();

            try {
                completedAppointment.markAsCompleted();
                expect.fail('Expected DomainError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
            }
        });

        it('should mark pending appointment as failed', () => {
            expect(appointment.status).toBe('pending');

            const failedAppointment = appointment.markAsFailed();

            expect(failedAppointment.status).toBe('failed');
            expect(failedAppointment.appointmentId).toBe(appointment.appointmentId);
            expect(failedAppointment.updatedAt.getTime()).toBeGreaterThanOrEqual(appointment.updatedAt.getTime());
        });

        it('should throw DomainError when failing completed appointment', () => {
            const completedAppointment = appointment.markAsCompleted();

            try {
                completedAppointment.markAsFailed();
                expect.fail('Expected DomainError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(DomainError);
            }
        });
    });

    describe('Status Queries', () => {
        it('should correctly identify pending appointments', () => {
            const appointment = Appointment.create(validAppointmentData);

            expect(appointment.isPending()).toBe(true);
            expect(appointment.isCompleted()).toBe(false);
            expect(appointment.isFailed()).toBe(false);
        });

        it('should correctly identify completed appointments', () => {
            const appointment = Appointment.create(validAppointmentData);
            const completedAppointment = appointment.markAsCompleted();

            expect(completedAppointment.isPending()).toBe(false);
            expect(completedAppointment.isCompleted()).toBe(true);
            expect(completedAppointment.isFailed()).toBe(false);
        });

        it('should correctly identify failed appointments', () => {
            const appointment = Appointment.create(validAppointmentData);
            const failedAppointment = appointment.markAsFailed();

            expect(failedAppointment.isPending()).toBe(false);
            expect(failedAppointment.isCompleted()).toBe(false);
            expect(failedAppointment.isFailed()).toBe(true);
        });
    });

    describe('Serialization', () => {
        it('should convert to props for persistence', () => {
            const appointment = Appointment.create(validAppointmentData);
            const props = appointment.toProps();

            expect(props).toHaveProperty('appointmentId');
            expect(props).toHaveProperty('insuredId', '12345');
            expect(props).toHaveProperty('scheduleId', 100);
            expect(props).toHaveProperty('countryISO', 'PE');
            expect(props).toHaveProperty('status', 'pending');
            expect(props).toHaveProperty('createdAt');
            expect(props).toHaveProperty('updatedAt');
            expect(props).toHaveProperty('centerId', 1);
            expect(props).toHaveProperty('specialtyId', 10);
            expect(props).toHaveProperty('medicId', 20);
            expect(props).toHaveProperty('slotDatetime');
        });

        it('should convert to JSON for API responses', () => {
            const appointment = Appointment.create(validAppointmentData);
            const json = appointment.toJSON();

            expect(json).toHaveProperty('appointmentId');
            expect(json).toHaveProperty('insuredId', '12345');
            expect(json).toHaveProperty('scheduleId', 100);
            expect(json).toHaveProperty('countryISO', 'PE');
            expect(json).toHaveProperty('status', 'pending');
            expect(json).toHaveProperty('createdAt');
            expect(json).toHaveProperty('updatedAt');
            expect(typeof json.createdAt).toBe('string');
            expect(typeof json.updatedAt).toBe('string');
            expect(typeof json.slotDatetime).toBe('string');
        });
    });
});
