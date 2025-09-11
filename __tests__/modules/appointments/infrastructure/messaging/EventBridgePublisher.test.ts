import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBridgePublisher } from '@/modules/appointments/infrastructure/messaging/EventBridgePublisher.js';
import { createAppointmentConfirmedEvent } from '@/modules/appointments/domain/events/AppointmentConfirmed.js';
import type { CountryISO } from '@/modules/appointments/domain/entities/Appointment.js';
import {
    mockEventBridgePutEventsResponse,
    mockSNSError,
} from '@tests/fixtures/mockResponses.js';

// Import AWS SDK modules to access mocked implementations
import {
    EventBridgeClient,
    PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

describe('EventBridgePublisher', () => {
    let publisher: EventBridgePublisher;
    let mockSend: any;
    const region = 'us-east-1';
    const eventBusName = 'test-event-bus';

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock implementations
        mockSend = vi.fn();
        const MockEventBridgeClient = EventBridgeClient as any;
        MockEventBridgeClient.mockImplementation(() => ({
            send: mockSend,
        }));

        publisher = new EventBridgePublisher(region, eventBusName);
    });

    describe('Constructor', () => {
        it('should initialize with region and event bus name', () => {
            const newPublisher = new EventBridgePublisher('us-west-2', 'custom-bus');
            expect(newPublisher).toBeInstanceOf(EventBridgePublisher);
        });

        it('should use default values when not provided', () => {
            const newPublisher = new EventBridgePublisher();
            expect(newPublisher).toBeInstanceOf(EventBridgePublisher);
        });
    });

    describe('publishAppointmentConfirmed()', () => {
        it('should publish AppointmentConfirmed event successfully for PE', async () => {
            // Arrange
            mockSend.mockResolvedValue(mockEventBridgePutEventsResponse);

            const appointmentConfirmedEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                source: 'appointment_pe',
            });

            // Act
            await publisher.publishAppointmentConfirmed(appointmentConfirmedEvent);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(PutEventsCommand).toHaveBeenCalledWith({
                Entries: [
                    {
                        Source: 'rimac.appointment',
                        DetailType: 'AppointmentConfirmed',
                        Detail: JSON.stringify(appointmentConfirmedEvent.detail),
                        EventBusName: eventBusName,
                        Time: expect.any(Date),
                    },
                ],
            });
        });

        it('should publish AppointmentConfirmed event successfully for CL', async () => {
            // Arrange
            mockSend.mockResolvedValue(mockEventBridgePutEventsResponse);

            const chileEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '67890',
                scheduleId: 200,
                countryISO: 'CL' as CountryISO,
                source: 'appointment_cl',
            });

            // Act
            await publisher.publishAppointmentConfirmed(chileEvent);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(PutEventsCommand).toHaveBeenCalledWith({
                Entries: [
                    {
                        Source: 'rimac.appointment',
                        DetailType: 'AppointmentConfirmed',
                        Detail: JSON.stringify(chileEvent.detail),
                        EventBusName: eventBusName,
                        Time: expect.any(Date),
                    },
                ],
            });
        });

        it('should handle EventBridge publish errors', async () => {
            // Arrange
            mockSend.mockRejectedValue(mockSNSError);

            const appointmentConfirmedEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                source: 'appointment_pe',
            });

            // Act & Assert
            await expect(
                publisher.publishAppointmentConfirmed(appointmentConfirmedEvent)
            ).rejects.toThrow();
        });

        it('should handle failed entries in EventBridge response', async () => {
            // Arrange
            const failedResponse = {
                FailedEntryCount: 1,
                Entries: [
                    {
                        ErrorCode: 'ValidationException',
                        ErrorMessage: 'Event size exceeded limit',
                    },
                ],
            };
            mockSend.mockResolvedValue(failedResponse);

            const appointmentConfirmedEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                source: 'appointment_pe',
            });

            // Act & Assert
            await expect(
                publisher.publishAppointmentConfirmed(appointmentConfirmedEvent)
            ).rejects.toThrow();
        });
    });

    describe('publishEvent()', () => {
        it('should publish generic event successfully', async () => {
            // Arrange
            mockSend.mockResolvedValue(mockEventBridgePutEventsResponse);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    insuredId: '12345',
                    scheduleId: 100,
                    countryISO: 'PE',
                },
            };

            // Act
            await publisher.publishEvent(eventData);

            // Assert
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(PutEventsCommand).toHaveBeenCalledWith({
                Entries: [
                    {
                        Source: 'appointments.api',
                        DetailType: 'AppointmentCreated',
                        Detail: JSON.stringify(eventData.detail),
                        EventBusName: eventBusName,
                        Time: expect.any(Date),
                    },
                ],
            });
        });

        it('should handle EventBridge publish errors for generic events', async () => {
            // Arrange
            mockSend.mockRejectedValue(mockSNSError);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    countryISO: 'PE',
                },
            };

            // Act & Assert
            await expect(publisher.publishEvent(eventData)).rejects.toThrow();
        });

        it('should handle failed entries for generic events', async () => {
            // Arrange
            const failedResponse = {
                FailedEntryCount: 1,
                Entries: [
                    {
                        ErrorCode: 'ThrottlingException',
                        ErrorMessage: 'Rate exceeded',
                    },
                ],
            };
            mockSend.mockResolvedValue(failedResponse);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    countryISO: 'PE',
                },
            };

            // Act & Assert
            await expect(publisher.publishEvent(eventData)).rejects.toThrow();
        });

        it('should include correct event structure', async () => {
            // Arrange
            mockSend.mockResolvedValue(mockEventBridgePutEventsResponse);

            const eventData = {
                source: 'custom.service',
                detailType: 'CustomEvent',
                detail: {
                    id: '123',
                    status: 'active',
                    metadata: {
                        version: '1.0',
                        timestamp: '2024-01-10T08:00:00Z',
                    },
                },
            };

            // Act
            await publisher.publishEvent(eventData);

            // Assert
            const putEventsCall = (PutEventsCommand as any).mock.calls[0][0];
            expect(putEventsCall.Entries).toHaveLength(1);

            const entry = putEventsCall.Entries[0];
            expect(entry.Source).toBe('custom.service');
            expect(entry.DetailType).toBe('CustomEvent');
            expect(entry.EventBusName).toBe(eventBusName);
            expect(entry.Time).toBeInstanceOf(Date);

            const parsedDetail = JSON.parse(entry.Detail);
            expect(parsedDetail).toEqual(eventData.detail);
        });
    });

    describe('Error Handling', () => {
        it('should wrap EventBridge errors in InfrastructureError', async () => {
            // Arrange
            const customError = new Error('EventBridge service unavailable');
            mockSend.mockRejectedValue(customError);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    countryISO: 'PE',
                },
            };

            // Act & Assert
            await expect(publisher.publishEvent(eventData)).rejects.toThrow();
        });

        it('should preserve InfrastructureError when already thrown', async () => {
            // Arrange
            const failedResponse = {
                FailedEntryCount: 1,
                Entries: [
                    {
                        ErrorCode: 'AccessDenied',
                        ErrorMessage: 'Insufficient permissions',
                    },
                ],
            };
            mockSend.mockResolvedValue(failedResponse);

            const appointmentConfirmedEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                source: 'appointment_pe',
            });

            // Act & Assert
            await expect(
                publisher.publishAppointmentConfirmed(appointmentConfirmedEvent)
            ).rejects.toThrow();
        });
    });
});
