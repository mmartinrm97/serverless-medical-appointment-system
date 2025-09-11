import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { handler } from '@/modules/appointments/interfaces/http/getAppointments.js';
import { ListAppointmentsByInsured } from '@/modules/appointments/application/use-cases/ListAppointmentsByInsured.js';
import { DynamoDBAppointmentsRepository } from '@/modules/appointments/infrastructure/db/dynamodb/DynamoDBAppointmentsRepository.js';

// Mock all dependencies
vi.mock('@/modules/appointments/application/use-cases/ListAppointmentsByInsured.js');
vi.mock('@/modules/appointments/infrastructure/db/dynamodb/DynamoDBAppointmentsRepository.js');

// Mock logger
vi.mock('@/shared/infrastructure/logging/logger.js', () => ({
    createFunctionLogger: vi.fn(() => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    })),
    logError: vi.fn(),
}));

describe('getAppointments Handler', () => {
    let mockEvent: APIGatewayProxyEvent;
    let mockContext: Context;
    let mockListAppointments: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mocks
        mockListAppointments = {
            execute: vi.fn(),
        };

        (ListAppointmentsByInsured as any).mockImplementation(() => mockListAppointments);
        (DynamoDBAppointmentsRepository as any).mockImplementation(() => ({}));

        // Setup base event
        mockEvent = {
            httpMethod: 'GET',
            path: '/appointments/12345',
            headers: { 'Content-Type': 'application/json' },
            pathParameters: { insuredId: '12345' },
            queryStringParameters: null,
            body: null,
            isBase64Encoded: false,
            requestContext: {
                requestId: 'test-request-id',
                accountId: '123456789012',
                apiId: 'test-api-id',
                stage: 'dev',
                requestTime: '09/Apr/1998:12:34:56 +0000',
                requestTimeEpoch: 892635296789,
                resourceId: 'test-resource-id',
                resourcePath: '/appointments/{insuredId}',
                httpMethod: 'GET',
                identity: { sourceIp: '127.0.0.1', userAgent: 'test-user-agent' } as any,
                protocol: 'HTTP/1.1',
                routeKey: 'GET /appointments/{insuredId}',
                eventType: 'REQUEST',
                operationName: 'GET /appointments/{insuredId}',
                domainName: 'test-domain.execute-api.us-east-1.amazonaws.com',
                domainPrefix: 'test-domain'
            } as any,
            resource: '/appointments/{insuredId}',
            stageVariables: null,
            multiValueHeaders: {},
            multiValueQueryStringParameters: null,
        };

        mockContext = {
            callbackWaitsForEmptyEventLoop: false,
            functionName: 'test-function',
            functionVersion: '1.0',
            invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            memoryLimitInMB: '128',
            awsRequestId: 'test-aws-request-id',
            logGroupName: '/aws/lambda/test-function',
            logStreamName: '2024/01/01/[$LATEST]test-stream',
            getRemainingTimeInMillis: () => 30000,
            done: vi.fn(),
            fail: vi.fn(),
            succeed: vi.fn(),
        };
    });

    it('should retrieve appointments successfully', async () => {
        // Arrange
        const mockAppointments = [
            {
                appointmentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
                scheduleId: 100,
                countryISO: 'PE',
                status: 'pending',
                createdAt: '2024-01-10T08:00:00.000Z',
                updatedAt: '2024-01-10T08:00:00.000Z',
                centerId: 1,
                specialtyId: 10,
                medicId: 20
            },
            {
                appointmentId: '01B5TGWJV5KP2N8CGJ6Q7Y8ZW2',
                scheduleId: 200,
                countryISO: 'CL',
                status: 'completed',
                createdAt: '2024-01-10T09:00:00.000Z',
                updatedAt: '2024-01-11T10:00:00.000Z',
                centerId: 2,
                specialtyId: 11,
                medicId: 21
            }
        ];

        mockListAppointments.execute.mockResolvedValue({
            appointments: mockAppointments
        });

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(200);
        expect(result.headers).toEqual({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        });

        const responseBody = JSON.parse(result.body);
        expect(responseBody.appointments).toHaveLength(2);
        expect(responseBody.appointments[0].appointmentId).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
        expect(responseBody.pagination.total).toBe(2);
        expect(responseBody.pagination.hasMore).toBe(false);
    });

    it('should filter appointments by status', async () => {
        // Arrange
        const mockAppointments = [
            {
                appointmentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
                scheduleId: 100,
                countryISO: 'PE',
                status: 'pending',
                createdAt: '2024-01-10T08:00:00.000Z',
                updatedAt: '2024-01-10T08:00:00.000Z'
            },
            {
                appointmentId: '01B5TGWJV5KP2N8CGJ6Q7Y8ZW2',
                scheduleId: 200,
                countryISO: 'CL',
                status: 'completed',
                createdAt: '2024-01-10T09:00:00.000Z',
                updatedAt: '2024-01-11T10:00:00.000Z'
            }
        ];

        mockEvent.queryStringParameters = { status: 'pending' };
        mockListAppointments.execute.mockResolvedValue({
            appointments: mockAppointments
        });

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.appointments).toHaveLength(1);
        expect(responseBody.appointments[0].status).toBe('pending');
    });

    it('should apply pagination limit', async () => {
        // Arrange
        const mockAppointments = Array.from({ length: 60 }, (_, i) => ({
            appointmentId: `01ARZ3NDEKTSV4RRFFQ69G5FA${i.toString().padStart(2, '0')}`,
            scheduleId: 100 + i,
            countryISO: 'PE',
            status: 'pending',
            createdAt: '2024-01-10T08:00:00.000Z',
            updatedAt: '2024-01-10T08:00:00.000Z'
        }));

        mockEvent.queryStringParameters = { limit: '10' };
        mockListAppointments.execute.mockResolvedValue({
            appointments: mockAppointments
        });

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.appointments).toHaveLength(10);
        expect(responseBody.pagination.hasMore).toBe(true);
    });

    it('should return 400 for invalid insuredId', async () => {
        // Arrange
        mockEvent.pathParameters = { insuredId: '123' }; // Too short

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(400);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('ValidationError');
        expect(responseBody.message).toBe('Invalid request parameters');
    });

    it('should return 400 for invalid query parameters', async () => {
        // Arrange
        mockEvent.queryStringParameters = {
            status: 'invalid-status',
            limit: '-1'
        };

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(400);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('ValidationError');
    });

    it('should return empty result when no appointments found', async () => {
        // Arrange
        mockListAppointments.execute.mockResolvedValue({
            appointments: []
        });

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(200);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.appointments).toHaveLength(0);
        expect(responseBody.pagination.total).toBe(0);
    });

    it('should handle application errors', async () => {
        // Arrange
        class TestAppError extends Error {
            name = 'DataAccessError';
            statusCode = 503;
        }

        mockListAppointments.execute.mockRejectedValue(new TestAppError('Database unavailable'));

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(500); // Las custom errors se mapean a 500 si no tienen statusCode
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('InternalServerError');
        expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('should handle unexpected errors', async () => {
        // Arrange
        mockListAppointments.execute.mockRejectedValue(new Error('Unexpected error'));

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(500);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('InternalServerError');
        expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('should include CORS headers in all responses', async () => {
        // Arrange
        mockListAppointments.execute.mockResolvedValue({ appointments: [] });

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.headers).toEqual({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        });
    });

    it('should initialize dependencies correctly', async () => {
        // Arrange
        mockListAppointments.execute.mockResolvedValue({ appointments: [] });

        // Act
        await handler(mockEvent, mockContext, vi.fn());

        // Assert
        expect(DynamoDBAppointmentsRepository).toHaveBeenCalledWith();
        expect(ListAppointmentsByInsured).toHaveBeenCalled();
        expect(mockListAppointments.execute).toHaveBeenCalledWith('12345');
    });
});
