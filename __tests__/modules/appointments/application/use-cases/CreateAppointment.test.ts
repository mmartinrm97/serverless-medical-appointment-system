import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateAppointment } from '@/modules/appointments/application/use-cases/CreateAppointment.js';
import type { CreateAppointmentRequest } from '@/modules/appointments/application/dtos/CreateAppointmentDto.js';
import type { CountryISO } from '@/modules/appointments/domain/entities/Appointment.js';

// Mock interfaces
const mockRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findByInsuredId: vi.fn(),
    updateStatus: vi.fn(),
    findByInsuredAndSchedule: vi.fn()
};

const mockEventPublisher = {
    publishEvent: vi.fn(),
    publishAppointmentConfirmed: vi.fn()
};

describe('CreateAppointment Use Case', () => {
    let createAppointment: CreateAppointment;

    beforeEach(() => {
        vi.clearAllMocks();
        createAppointment = new CreateAppointment(mockRepository, mockEventPublisher);
    });

    describe('Happy Path', () => {
        it('should create appointment successfully', async () => {
            // Arrange
            mockRepository.findByInsuredAndSchedule.mockResolvedValue(null);
            mockRepository.save.mockResolvedValue(undefined);
            mockEventPublisher.publishEvent.mockResolvedValue(undefined);

            const request: CreateAppointmentRequest = {
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                centerId: 1,
                specialtyId: 10,
                medicId: 20,
                slotDatetime: new Date('2024-01-15T10:00:00Z')
            };

            // Act
            const result = await createAppointment.execute(request);

            // Assert
            expect(result.appointmentId).toBeDefined();
            expect(result.insuredId).toBe('12345');
            expect(result.scheduleId).toBe(100);
            expect(result.countryISO).toBe('PE');
            expect(result.status).toBe('pending');
            expect(result.message).toContain('Processing in progress');
            expect(mockRepository.save).toHaveBeenCalledTimes(1);
            expect(mockEventPublisher.publishEvent).toHaveBeenCalledTimes(1);
        });

        it('should handle duplicate appointment (idempotency)', async () => {
            // Arrange
            const existingAppointment = {
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                createdAt: new Date('2024-01-10T08:00:00Z')
            };

            mockRepository.findByInsuredAndSchedule.mockResolvedValue(existingAppointment);

            const request: CreateAppointmentRequest = {
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE',
                slotDatetime: undefined
            };

            // Act
            const result = await createAppointment.execute(request);

            // Assert
            expect(result.appointmentId).toBe(existingAppointment.appointmentId);
            expect(mockRepository.save).not.toHaveBeenCalled();
            expect(mockEventPublisher.publishEvent).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle repository save errors', async () => {
            // Arrange
            mockRepository.findByInsuredAndSchedule.mockResolvedValue(null);
            const repositoryError = new Error('DynamoDB save failed');
            mockRepository.save.mockRejectedValue(repositoryError);

            const request: CreateAppointmentRequest = {
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE',
                slotDatetime: undefined
            };

            // Act & Assert
            await expect(createAppointment.execute(request)).rejects.toThrow();
            expect(mockEventPublisher.publishEvent).not.toHaveBeenCalled();
        });

        it('should handle event publishing errors', async () => {
            // Arrange
            mockRepository.findByInsuredAndSchedule.mockResolvedValue(null);
            mockRepository.save.mockResolvedValue(undefined);
            const publishError = new Error('SNS publish failed');
            mockEventPublisher.publishEvent.mockRejectedValue(publishError);

            const request: CreateAppointmentRequest = {
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE',
                slotDatetime: undefined
            };

            // Act & Assert
            await expect(createAppointment.execute(request)).rejects.toThrow();
            expect(mockRepository.save).toHaveBeenCalledTimes(1);
        });
    });

    describe('Validation', () => {
        it('should validate insured ID format', async () => {
            // Arrange
            const request = {
                insuredId: '123', // Invalid - not 5 digits
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                slotDatetime: undefined
            };

            // Act & Assert
            await expect(createAppointment.execute(request)).rejects.toThrow();
            expect(mockRepository.save).not.toHaveBeenCalled();
            expect(mockEventPublisher.publishEvent).not.toHaveBeenCalled();
        });

        it('should validate schedule ID', async () => {
            // Arrange
            const request = {
                insuredId: '12345',
                scheduleId: 0, // Invalid - not positive
                countryISO: 'PE' as CountryISO,
                slotDatetime: undefined
            };

            // Act & Assert
            await expect(createAppointment.execute(request)).rejects.toThrow();
            expect(mockRepository.save).not.toHaveBeenCalled();
            expect(mockEventPublisher.publishEvent).not.toHaveBeenCalled();
        });
    });
});
