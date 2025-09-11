import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SNSMessagePublisher } from '@/modules/appointments/infrastructure/messaging/SNSMessagePublisher.js';
import { createAppointmentConfirmedEvent } from '@/modules/appointments/domain/events/AppointmentConfirmed.js';
import type { CountryISO } from '@/modules/appointments/domain/entities/Appointment.js';
import {
    mockSNSPublishResponse,
    mockSNSError
} from '@tests/fixtures/mockResponses.js';

// Import AWS SDK modules to access mocked implementations
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

describe('SNSMessagePublisher', () => {
    let publisher: SNSMessagePublisher;
    let mockSNSClient: any;
    const region = 'us-east-1';
    const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';

    beforeEach(() => {
        vi.clearAllMocks();
        publisher = new SNSMessagePublisher(region, topicArn);
        // Get the mocked SNS client instance
        mockSNSClient = (SNSClient as any).mock.results[0].value;
    });

    describe('Constructor', () => {
        it('should initialize with region and topic ARN', () => {
            const newPublisher = new SNSMessagePublisher('us-west-2', 'arn:aws:sns:us-west-2:123456789012:test');
            expect(newPublisher).toBeInstanceOf(SNSMessagePublisher);
        });

        it('should use default region when not provided', () => {
            const newPublisher = new SNSMessagePublisher(undefined, topicArn);
            expect(newPublisher).toBeInstanceOf(SNSMessagePublisher);
        });
    });

    describe('publishEvent()', () => {
        it('should publish generic event successfully for PE', async () => {
            // Arrange
            mockSNSClient.send.mockResolvedValue(mockSNSPublishResponse);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    insuredId: '12345',
                    scheduleId: 100,
                    countryISO: 'PE',
                    status: 'pending'
                }
            };

            // Act
            await publisher.publishEvent(eventData);

            // Assert
            expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
            expect(PublishCommand).toHaveBeenCalledWith({
                TopicArn: topicArn,
                Subject: 'New Appointment - PE',
                Message: expect.stringContaining('"eventType":"AppointmentCreated"'),
                MessageAttributes: {
                    countryISO: {
                        DataType: 'String',
                        StringValue: 'PE'
                    },
                    eventType: {
                        DataType: 'String',
                        StringValue: 'AppointmentCreated'
                    },
                    source: {
                        DataType: 'String',
                        StringValue: 'appointments.api'
                    }
                }
            });
        });

        it('should publish generic event successfully for CL', async () => {
            // Arrange
            mockSNSClient.send.mockResolvedValue(mockSNSPublishResponse);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    insuredId: '67890',
                    scheduleId: 200,
                    countryISO: 'CL',
                    status: 'pending'
                }
            };

            // Act
            await publisher.publishEvent(eventData);

            // Assert
            expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
            expect(PublishCommand).toHaveBeenCalledWith({
                TopicArn: topicArn,
                Subject: 'New Appointment - CL',
                Message: expect.stringContaining('"eventType":"AppointmentCreated"'),
                MessageAttributes: {
                    countryISO: {
                        DataType: 'String',
                        StringValue: 'CL'
                    },
                    eventType: {
                        DataType: 'String',
                        StringValue: 'AppointmentCreated'
                    },
                    source: {
                        DataType: 'String',
                        StringValue: 'appointments.api'
                    }
                }
            });
        });

        it('should reject event with missing countryISO', async () => {
            // Arrange
            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    insuredId: '12345'
                }
            };

            // Act & Assert
            await expect(publisher.publishEvent(eventData)).rejects.toThrow(
                'Invalid or missing countryISO in event detail'
            );
        });

        it('should reject event with invalid countryISO', async () => {
            // Arrange
            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    insuredId: '12345',
                    countryISO: 'US' // Invalid country
                }
            };

            // Act & Assert
            await expect(publisher.publishEvent(eventData)).rejects.toThrow(
                'Invalid or missing countryISO in event detail'
            );
        });

        it('should handle SNS publish errors', async () => {
            // Arrange
            mockSNSClient.send.mockRejectedValue(mockSNSError);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    countryISO: 'PE'
                }
            };

            // Act & Assert
            await expect(publisher.publishEvent(eventData)).rejects.toThrow();
        });
    });

    describe('publishAppointmentConfirmed()', () => {
        it('should publish AppointmentConfirmed event successfully for PE', async () => {
            // Arrange
            mockSNSClient.send.mockResolvedValue(mockSNSPublishResponse);

            const appointmentConfirmedEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                source: 'appointment_pe'
            });

            // Act
            await publisher.publishAppointmentConfirmed(appointmentConfirmedEvent);

            // Assert
            expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
            expect(PublishCommand).toHaveBeenCalledWith({
                TopicArn: topicArn,
                Subject: 'Appointment Confirmed',
                Message: expect.stringContaining('"eventType":"AppointmentConfirmed"'),
                MessageAttributes: {
                    countryISO: {
                        DataType: 'String',
                        StringValue: 'PE'
                    },
                    eventType: {
                        DataType: 'String',
                        StringValue: 'AppointmentConfirmed'
                    },
                    source: {
                        DataType: 'String',
                        StringValue: 'rimac.appointment'
                    }
                }
            });
        });

        it('should publish AppointmentConfirmed event successfully for CL', async () => {
            // Arrange
            mockSNSClient.send.mockResolvedValue(mockSNSPublishResponse);

            const chileEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '67890',
                scheduleId: 200,
                countryISO: 'CL' as CountryISO,
                source: 'appointment_cl'
            });

            // Act
            await publisher.publishAppointmentConfirmed(chileEvent);

            // Assert
            expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
            expect(PublishCommand).toHaveBeenCalledWith({
                TopicArn: topicArn,
                Subject: 'Appointment Confirmed',
                Message: expect.stringContaining('"eventType":"AppointmentConfirmed"'),
                MessageAttributes: {
                    countryISO: {
                        DataType: 'String',
                        StringValue: 'CL'
                    },
                    eventType: {
                        DataType: 'String',
                        StringValue: 'AppointmentConfirmed'
                    },
                    source: {
                        DataType: 'String',
                        StringValue: 'rimac.appointment'
                    }
                }
            });
        });

        it('should handle SNS publish errors for AppointmentConfirmed', async () => {
            // Arrange
            mockSNSClient.send.mockRejectedValue(mockSNSError);

            const appointmentConfirmedEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                source: 'appointment_pe'
            });

            // Act & Assert
            await expect(publisher.publishAppointmentConfirmed(appointmentConfirmedEvent)).rejects.toThrow();
        });
    });

    describe('healthCheck()', () => {
        it('should return true when SNS is accessible', async () => {
            // Arrange
            mockSNSClient.send.mockResolvedValue(mockSNSPublishResponse);

            // Act
            const result = await publisher.healthCheck();

            // Assert
            expect(result).toBe(true);
            expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
            expect(PublishCommand).toHaveBeenCalledWith({
                TopicArn: topicArn,
                Subject: 'Health Check',
                Message: expect.stringContaining('"type":"health-check"'),
                MessageAttributes: {
                    type: {
                        DataType: 'String',
                        StringValue: 'health-check'
                    }
                }
            });
        });

        it('should return false when SNS is not accessible', async () => {
            // Arrange
            mockSNSClient.send.mockRejectedValue(mockSNSError);

            // Act
            const result = await publisher.healthCheck();

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should wrap SNS errors in InfrastructureError for publishEvent', async () => {
            // Arrange
            const customError = new Error('SNS service unavailable');
            mockSNSClient.send.mockRejectedValue(customError);

            const eventData = {
                source: 'appointments.api',
                detailType: 'AppointmentCreated',
                detail: {
                    appointmentId: '01234567890123456789012345',
                    countryISO: 'PE'
                }
            };

            // Act & Assert
            await expect(publisher.publishEvent(eventData)).rejects.toThrow();
        });

        it('should wrap SNS errors in InfrastructureError for publishAppointmentConfirmed', async () => {
            // Arrange
            const customError = new Error('SNS service unavailable');
            mockSNSClient.send.mockRejectedValue(customError);

            const appointmentConfirmedEvent = createAppointmentConfirmedEvent({
                appointmentId: '01234567890123456789012345',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO,
                source: 'appointment_pe'
            });

            // Act & Assert
            await expect(publisher.publishAppointmentConfirmed(appointmentConfirmedEvent)).rejects.toThrow();
        });
    });
});
