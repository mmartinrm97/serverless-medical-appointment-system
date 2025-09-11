import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamoDBAppointmentsRepository } from '@/modules/appointments/infrastructure/db/dynamodb/DynamoDBAppointmentsRepository.js';
import { Appointment, type CountryISO } from '@/modules/appointments/domain/entities/Appointment.js';
import {
    mockDynamoDBGetResponse,
    mockDynamoDBQueryResponse,
    mockDynamoDBPutResponse,
    mockDynamoDBUpdateResponse,
    mockDynamoDBError
} from '@tests/fixtures/mockResponses.js';

// Import AWS SDK modules to access mocked implementations
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    UpdateCommand
} from '@aws-sdk/lib-dynamodb'; describe('DynamoDBAppointmentsRepository', () => {
    let repository: DynamoDBAppointmentsRepository;
    let mockDynamoDBClient: any;
    const tableName = 'appointments';

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new DynamoDBAppointmentsRepository('us-east-1', tableName);
        // Get the mocked DynamoDB client instance
        mockDynamoDBClient = (DynamoDBDocumentClient.from as any).mock.results[0].value;
    });

    describe('save()', () => {
        it('should save appointment successfully', async () => {
            // Arrange
            mockDynamoDBClient.send.mockResolvedValue(mockDynamoDBPutResponse);
            const appointment = Appointment.create({
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO
            });

            // Act
            await repository.save(appointment);

            // Assert
            expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(1);
            expect(PutCommand).toHaveBeenCalledWith({
                TableName: tableName,
                Item: expect.objectContaining({
                    PK: '12345',
                    SK: appointment.appointmentId,
                    appointmentId: appointment.appointmentId,
                    scheduleId: 100,
                    countryISO: 'PE',
                    status: 'pending',
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String)
                }),
                ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
            });
        });

        it('should handle save errors', async () => {
            // Arrange
            mockDynamoDBClient.send.mockRejectedValue(mockDynamoDBError);
            const appointment = Appointment.create({
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE' as CountryISO
            });

            // Act & Assert
            await expect(repository.save(appointment)).rejects.toThrow();
        });
    });

    describe('findById()', () => {
        it('should find appointment by id successfully', async () => {
            // Arrange
            const validUlid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
            const queryResponse = {
                Items: [{
                    ...mockDynamoDBGetResponse.Item,
                    SK: validUlid,
                    appointmentId: validUlid
                }],
                Count: 1,
                ScannedCount: 1
            };
            mockDynamoDBClient.send.mockResolvedValue(queryResponse);

            // Act
            const result = await repository.findById(validUlid);

            // Assert
            expect(result).toBeInstanceOf(Appointment);
            expect(result?.appointmentId).toBe(validUlid);
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: tableName,
                IndexName: 'AppointmentIdIndex',
                KeyConditionExpression: 'appointmentId = :appointmentId',
                ExpressionAttributeValues: {
                    ':appointmentId': validUlid
                }
            });
        });

        it('should return null when appointment not found', async () => {
            // Arrange
            mockDynamoDBClient.send.mockResolvedValue({ Items: [], Count: 0, ScannedCount: 0 });

            // Act
            const result = await repository.findById('nonexistent-id');

            // Assert
            expect(result).toBeNull();
        });

        it('should handle find errors', async () => {
            // Arrange
            mockDynamoDBClient.send.mockRejectedValue(mockDynamoDBError);

            // Act & Assert
            await expect(repository.findById('test-id')).rejects.toThrow();
        });
    });

    describe('findByInsuredId()', () => {
        it('should find appointments by insured id successfully', async () => {
            // Arrange
            mockDynamoDBClient.send.mockResolvedValue(mockDynamoDBQueryResponse);

            // Act
            const result = await repository.findByInsuredId('12345');

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(Appointment);
            expect(result[1]).toBeInstanceOf(Appointment);
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: tableName,
                KeyConditionExpression: 'PK = :insuredId',
                ExpressionAttributeValues: {
                    ':insuredId': '12345'
                },
                ScanIndexForward: false
            });
        });

        it('should return empty array when no appointments found', async () => {
            // Arrange
            mockDynamoDBClient.send.mockResolvedValue({ Items: [] });

            // Act
            const result = await repository.findByInsuredId('12345');

            // Assert
            expect(result).toHaveLength(0);
        });

        it('should handle query errors', async () => {
            // Arrange
            mockDynamoDBClient.send.mockRejectedValue(mockDynamoDBError);

            // Act & Assert
            await expect(repository.findByInsuredId('12345')).rejects.toThrow();
        });

        it('should handle single appointment result', async () => {
            // Arrange
            const singleItemResponse = {
                Items: [mockDynamoDBQueryResponse.Items[0]]
            };
            mockDynamoDBClient.send.mockResolvedValue(singleItemResponse);

            // Act
            const result = await repository.findByInsuredId('12345');

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Appointment);
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: tableName,
                KeyConditionExpression: 'PK = :insuredId',
                ExpressionAttributeValues: {
                    ':insuredId': '12345'
                },
                ScanIndexForward: false
            });
        });

        it('should handle undefined Items response', async () => {
            // Arrange
            mockDynamoDBClient.send.mockResolvedValue({ Items: [] });

            // Act
            const result = await repository.findByInsuredId('12345');

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    describe('updateStatus()', () => {
        it('should update appointment status successfully', async () => {
            // Arrange
            const validUlid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
            const findByIdResponse = {
                Items: [mockDynamoDBGetResponse.Item],
                Count: 1,
                ScannedCount: 1
            };
            mockDynamoDBClient.send
                .mockResolvedValueOnce(findByIdResponse) // First call for findById
                .mockResolvedValueOnce(mockDynamoDBUpdateResponse); // Second call for update

            // Act
            const result = await repository.updateStatus(validUlid, 'completed');

            // Assert
            expect(result).toBeInstanceOf(Appointment);
            expect(result?.status).toBe('completed');
            expect(mockDynamoDBClient.send).toHaveBeenCalledTimes(2);
            expect(UpdateCommand).toHaveBeenCalledWith({
                TableName: tableName,
                Key: {
                    PK: '12345',
                    SK: validUlid
                },
                UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': 'completed',
                    ':updatedAt': expect.any(String)
                },
                ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
                ReturnValues: 'ALL_NEW'
            });
        });

        it('should return null when appointment not found', async () => {
            // Arrange
            mockDynamoDBClient.send.mockResolvedValue({ Items: [], Count: 0, ScannedCount: 0 });

            // Act
            const result = await repository.updateStatus('nonexistent-id', 'completed');

            // Assert
            expect(result).toBeNull();
        });

        it('should handle update errors', async () => {
            // Arrange
            mockDynamoDBClient.send.mockRejectedValue(mockDynamoDBError);

            // Act & Assert
            await expect(repository.updateStatus('test-id', 'completed')).rejects.toThrow();
        });
    });

    describe('Domain entity conversion', () => {
        it('should correctly convert DynamoDB item to domain entity', async () => {
            // Arrange
            const validUlid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
            const dynamoItem = {
                PK: '12345',
                SK: validUlid,
                appointmentId: validUlid,
                scheduleId: 100,
                countryISO: 'PE',
                status: 'pending',
                createdAt: '2024-01-10T08:00:00.000Z',
                updatedAt: '2024-01-10T08:00:00.000Z',
                centerId: 1,
                specialtyId: 10,
                medicId: 20,
                slotDatetime: '2024-01-15T10:00:00.000Z'
            };
            const queryResponse = {
                Items: [dynamoItem],
                Count: 1,
                ScannedCount: 1
            };
            mockDynamoDBClient.send.mockResolvedValue(queryResponse);

            // Act
            const result = await repository.findById(validUlid);

            // Assert
            expect(result).toBeInstanceOf(Appointment);
            expect(result?.appointmentId).toBe(validUlid);
            expect(result?.insuredId).toBe('12345');
            expect(result?.scheduleId).toBe(100);
            expect(result?.countryISO).toBe('PE');
            expect(result?.status).toBe('pending');
            expect(result?.centerId).toBe(1);
            expect(result?.specialtyId).toBe(10);
            expect(result?.medicId).toBe(20);
            expect(result?.slotDatetime).toEqual(new Date('2024-01-15T10:00:00.000Z'));
        });

        it('should handle optional fields correctly', async () => {
            // Arrange
            const validUlid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
            const minimalItem = {
                PK: '12345',
                SK: validUlid,
                appointmentId: validUlid,
                scheduleId: 100,
                countryISO: 'PE',
                status: 'pending',
                createdAt: '2024-01-10T08:00:00.000Z',
                updatedAt: '2024-01-10T08:00:00.000Z'
            };
            const queryResponse = {
                Items: [minimalItem],
                Count: 1,
                ScannedCount: 1
            };
            mockDynamoDBClient.send.mockResolvedValue(queryResponse);

            // Act
            const result = await repository.findById(validUlid);

            // Assert
            expect(result).toBeInstanceOf(Appointment);
            expect(result?.appointmentId).toBe(validUlid);
            expect(result?.centerId).toBeUndefined();
            expect(result?.specialtyId).toBeUndefined();
            expect(result?.medicId).toBeUndefined();
            expect(result?.slotDatetime).toBeUndefined();
        });
    });
});