import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { handler } from '@/modules/appointments/interfaces/http/postAppointment.js';
import { CreateAppointment } from '@/modules/appointments/application/use-cases/CreateAppointment.js';
import { DynamoDBAppointmentsRepository } from '@/modules/appointments/infrastructure/db/dynamodb/DynamoDBAppointmentsRepository.js';
import { SNSMessagePublisher } from '@/modules/appointments/infrastructure/messaging/SNSMessagePublisher.js';

// Mock all dependencies
vi.mock('@/modules/appointments/application/use-cases/CreateAppointment.js');
vi.mock('@/modules/appointments/infrastructure/db/dynamodb/DynamoDBAppointmentsRepository.js');
vi.mock('@/modules/appointments/infrastructure/messaging/SNSMessagePublisher.js');

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

describe('postAppointment Handler', () => {
    let mockEvent: APIGatewayProxyEvent;
    let mockContext: Context;
    let mockCreateAppointment: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mocks
        mockCreateAppointment = {
            execute: vi.fn(),
        };

        (CreateAppointment as any).mockImplementation(() => mockCreateAppointment);
        (DynamoDBAppointmentsRepository as any).mockImplementation(() => ({}));
        (SNSMessagePublisher as any).mockImplementation(() => ({}));

        // Mock environment variables
        process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:appointment-notifications';
        process.env.AWS_REGION = 'us-east-1';

        // Setup base event
        mockEvent = {
            httpMethod: 'POST',
            path: '/appointments',
            headers: { 'Content-Type': 'application/json' },
            pathParameters: null,
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
                resourcePath: '/appointments',
                httpMethod: 'POST',
                identity: { sourceIp: '127.0.0.1', userAgent: 'test-user-agent' } as any,
                protocol: 'HTTP/1.1',
                routeKey: 'POST /appointments',
                eventType: 'REQUEST',
                operationName: 'POST /appointments',
                domainName: 'test-domain.execute-api.us-east-1.amazonaws.com',
                domainPrefix: 'test-domain'
            } as any,
            resource: '/appointments',
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

    it('should create appointment successfully with valid data', async () => {
        // Arrange
        const requestBody = {
            insuredId: '12345',
            scheduleId: 100,
            countryISO: 'PE'
        };

        const expectedResponse = {
            appointmentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            scheduleId: 100,
            countryISO: 'PE',
            status: 'pending',
            createdAt: '2024-01-10T08:00:00.000Z',
            message: 'Appointment created successfully and is being processed'
        };

        mockEvent.body = JSON.stringify(requestBody);
        mockCreateAppointment.execute.mockResolvedValue(expectedResponse);

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(201);
        expect(result.headers).toEqual({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        });

        const responseBody = JSON.parse(result.body);
        expect(responseBody).toEqual(expectedResponse);
    });

    it('should return 400 for invalid request body', async () => {
        // Arrange
        const invalidRequestBody = {
            insuredId: '123', // Too short
            scheduleId: -1,   // Negative
            countryISO: 'XX'  // Invalid country
        };

        mockEvent.body = JSON.stringify(invalidRequestBody);

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(400);
        expect(result.headers!['Content-Type']).toBe('application/json');
        expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');

        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('ValidationError');
        expect(responseBody.message).toBe('Invalid request data');
    });

    it('should return 400 for empty request body', async () => {
        // Arrange
        mockEvent.body = null;

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(400);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('ValidationError');
    });

    it('should handle application errors', async () => {
        // Arrange
        const requestBody = {
            insuredId: '12345',
            scheduleId: 100,
            countryISO: 'PE'
        };

        mockEvent.body = JSON.stringify(requestBody);

        class TestAppError extends Error {
            name = 'BusinessLogicError';
            statusCode = 409;
        }

        mockCreateAppointment.execute.mockRejectedValue(new TestAppError('Appointment slot already taken'));

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(500); // Custom errors sin AppError se tratan como 500
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('InternalServerError');
        expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('should handle unexpected errors', async () => {
        // Arrange
        const requestBody = {
            insuredId: '12345',
            scheduleId: 100,
            countryISO: 'PE'
        };

        mockEvent.body = JSON.stringify(requestBody);
        mockCreateAppointment.execute.mockRejectedValue(new Error('Database connection failed'));

        // Act
        const result = await handler(mockEvent, mockContext, vi.fn()) as APIGatewayProxyResult;

        // Assert
        expect(result.statusCode).toBe(500);
        const responseBody = JSON.parse(result.body);
        expect(responseBody.error).toBe('InternalServerError');
        expect(responseBody.message).toBe('An unexpected error occurred');
    });

    it('should include CORS headers in success response', async () => {
        // Arrange
        const requestBody = {
            insuredId: '12345',
            scheduleId: 100,
            countryISO: 'PE'
        };

        mockEvent.body = JSON.stringify(requestBody);
        mockCreateAppointment.execute.mockResolvedValue({
            appointmentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            status: 'pending'
        });

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
        const requestBody = {
            insuredId: '12345',
            scheduleId: 100,
            countryISO: 'PE'
        };

        mockEvent.body = JSON.stringify(requestBody);
        mockCreateAppointment.execute.mockResolvedValue({});

        // Act
        await handler(mockEvent, mockContext, vi.fn());

        // Assert
        expect(DynamoDBAppointmentsRepository).toHaveBeenCalledWith();
        expect(SNSMessagePublisher).toHaveBeenCalledWith(
            'arn:aws:sns:us-east-1:123456789012:appointment-notifications',
            'us-east-1'
        );
    });
});
