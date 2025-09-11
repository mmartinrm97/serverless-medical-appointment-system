import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler as postAppointmentHandler } from '@/modules/appointments/interfaces/http/postAppointment.js';
import { handler as getAppointmentsHandler } from '@/modules/appointments/interfaces/http/getAppointments.js';
import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Integration Tests for Medical Appointments API
 * 
 * These tests validate the complete API flow from HTTP requests to responses,
 * testing the integration between all layers of the application.
 * 
 * Note: These tests run against real handlers but with mocked AWS services.
 * They verify error handling and response structure when AWS services are not available.
 */
describe('API Integration Tests', () => {
    let mockContext: Context;
    const _mockCallback = () => { };

    beforeAll(async () => {
        // Setup environment variables for integration tests
        process.env.AWS_REGION = 'us-east-1';
        process.env.DYNAMODB_TABLE_NAME = 'appointments-test';
        process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:appointment-notifications-test';
    });

    beforeEach(() => {
        // Setup mock Lambda context
        mockContext = {
            callbackWaitsForEmptyEventLoop: false,
            functionName: 'test-function',
            functionVersion: '$LATEST',
            invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
            memoryLimitInMB: '128',
            awsRequestId: 'test-integration-request-id',
            logGroupName: '/aws/lambda/test-function',
            logStreamName: '2024/01/01/[$LATEST]integration-test-stream',
            getRemainingTimeInMillis: () => 30000,
            done: () => { },
            fail: () => { },
            succeed: () => { }
        };
    });

    afterAll(() => {
        // Cleanup environment variables
        delete process.env.DYNAMODB_TABLE_NAME;
        delete process.env.SNS_TOPIC_ARN;
    });

    describe('POST /appointments - Integration Flow', () => {
        it('should handle valid request with proper structure (expect AWS service error)', async () => {
            // Arrange
            const validRequestBody = {
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE',
                centerId: 1,
                specialtyId: 10,
                medicId: 20,
                slotDatetime: '2024-01-15T10:00:00.000Z'
            };

            const event: APIGatewayProxyEvent = {
                httpMethod: 'POST',
                path: '/appointments',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://medical-app.com'
                },
                pathParameters: null,
                queryStringParameters: null,
                body: JSON.stringify(validRequestBody),
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'integration-test-request-id',
                    accountId: '123456789012',
                    apiId: 'test-api-id',
                    stage: 'test',
                    requestTime: '10/Jan/2024:08:00:00 +0000',
                    requestTimeEpoch: 1704873600000,
                    resourceId: 'test-resource-id',
                    resourcePath: '/appointments',
                    httpMethod: 'POST',
                    identity: {
                        sourceIp: '192.168.1.100',
                        userAgent: 'Integration-Test-Client/1.0'
                    } as any,
                    protocol: 'HTTP/1.1',
                    routeKey: 'POST /appointments',
                    eventType: 'REQUEST',
                    operationName: 'POST /appointments',
                    domainName: 'test-api.execute-api.us-east-1.amazonaws.com',
                    domainPrefix: 'test-api'
                } as any,
                resource: '/appointments',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            // Act
            const result = await postAppointmentHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Assert - In integration tests, we expect 500 because AWS services aren't available
            // But we can verify the handler structure and error handling
            expect(result.statusCode).toBe(500);
            expect(result.headers).toMatchObject({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });

            const responseBody = JSON.parse(result.body);
            expect(responseBody).toMatchObject({
                error: 'InfrastructureError',
                message: expect.stringContaining('Infrastructure error')
            });
        });

        it('should handle validation errors properly', async () => {
            // Arrange - Invalid request body
            const invalidRequestBody = {
                insuredId: '123', // Too short
                scheduleId: -1,   // Negative
                countryISO: 'US', // Invalid country
                centerId: 'invalid', // Should be number
                specialtyId: 10,
                medicId: 20,
                slotDatetime: 'invalid-date'
            };

            const event: APIGatewayProxyEvent = {
                httpMethod: 'POST',
                path: '/appointments',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: null,
                queryStringParameters: null,
                body: JSON.stringify(invalidRequestBody),
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'integration-validation-error-test',
                    accountId: '123456789012',
                    apiId: 'test-api-id',
                    stage: 'test',
                    requestTime: '10/Jan/2024:08:00:00 +0000',
                    requestTimeEpoch: 1704873600000,
                    resourceId: 'test-resource-id',
                    resourcePath: '/appointments',
                    httpMethod: 'POST',
                    identity: { sourceIp: '192.168.1.100' } as any,
                    protocol: 'HTTP/1.1',
                    routeKey: 'POST /appointments',
                    eventType: 'REQUEST',
                    operationName: 'POST /appointments',
                    domainName: 'test-api.execute-api.us-east-1.amazonaws.com',
                    domainPrefix: 'test-api'
                } as any,
                resource: '/appointments',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            // Act
            const result = await postAppointmentHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Assert - Validation should happen before AWS service calls
            expect(result.statusCode).toBe(400);
            expect(result.headers).toMatchObject({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });

            const responseBody = JSON.parse(result.body);
            expect(responseBody).toMatchObject({
                error: 'ValidationError',
                message: 'Invalid request data',
                details: expect.any(Array)
            });

            // Validate that validation details are present
            expect(responseBody.details.length).toBeGreaterThan(0);
        });

        it('should handle malformed JSON properly', async () => {
            // Arrange - Malformed JSON
            const event: APIGatewayProxyEvent = {
                httpMethod: 'POST',
                path: '/appointments',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: null,
                queryStringParameters: null,
                body: '{ invalid json',
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'integration-malformed-json-test',
                    accountId: '123456789012',
                    apiId: 'test-api-id',
                    stage: 'test'
                } as any,
                resource: '/appointments',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            // Act
            const result = await postAppointmentHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Assert - JSON parsing should fail gracefully
            expect(result.statusCode).toBe(500);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toMatchObject({
                error: 'InternalServerError',
                message: 'An unexpected error occurred'
            });
        });
    });

    describe('GET /appointments/{insuredId} - Integration Flow', () => {
        it('should handle valid insuredId request (expect AWS service error)', async () => {
            // Arrange
            const event: APIGatewayProxyEvent = {
                httpMethod: 'GET',
                path: '/appointments/12345',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: { insuredId: '12345' },
                queryStringParameters: null,
                body: null,
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'integration-get-test',
                    accountId: '123456789012',
                    apiId: 'test-api-id',
                    stage: 'test',
                    requestTime: '10/Jan/2024:08:00:00 +0000',
                    requestTimeEpoch: 1704873600000,
                    resourceId: 'test-resource-id',
                    resourcePath: '/appointments/{insuredId}',
                    httpMethod: 'GET',
                    identity: { sourceIp: '192.168.1.100' } as any,
                    protocol: 'HTTP/1.1',
                    routeKey: 'GET /appointments/{insuredId}',
                    eventType: 'REQUEST',
                    operationName: 'GET /appointments/{insuredId}',
                    domainName: 'test-api.execute-api.us-east-1.amazonaws.com',
                    domainPrefix: 'test-api'
                } as any,
                resource: '/appointments/{insuredId}',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            // Act
            const result = await getAppointmentsHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Assert - Should return 500 because DynamoDB is not available
            expect(result.statusCode).toBe(500);
            expect(result.headers).toMatchObject({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });

            const responseBody = JSON.parse(result.body);
            expect(responseBody).toMatchObject({
                error: 'InfrastructureError',
                message: expect.stringContaining('Infrastructure error')
            });
        });

        it('should handle query parameters structure', async () => {
            // Arrange
            const event: APIGatewayProxyEvent = {
                httpMethod: 'GET',
                path: '/appointments/12345',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: { insuredId: '12345' },
                queryStringParameters: {
                    status: 'pending',
                    limit: '10'
                },
                body: null,
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'integration-get-with-params-test',
                    accountId: '123456789012',
                    apiId: 'test-api-id',
                    stage: 'test'
                } as any,
                resource: '/appointments/{insuredId}',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            // Act
            const result = await getAppointmentsHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Assert - Should return 500 because DynamoDB is not available (but validation passed)
            expect(result.statusCode).toBe(500);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toMatchObject({
                error: 'InfrastructureError',
                message: expect.stringContaining('Infrastructure error')
            });
        });

        it('should handle invalid insuredId validation', async () => {
            // Arrange - Invalid insuredId (too short)
            const event: APIGatewayProxyEvent = {
                httpMethod: 'GET',
                path: '/appointments/123',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: { insuredId: '123' },
                queryStringParameters: null,
                body: null,
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'integration-get-invalid-id-test',
                    accountId: '123456789012',
                    apiId: 'test-api-id',
                    stage: 'test'
                } as any,
                resource: '/appointments/{insuredId}',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            // Act
            const result = await getAppointmentsHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Assert - Should return validation error before hitting AWS services
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toMatchObject({
                error: 'ValidationError',
                message: 'Invalid request parameters',
                details: expect.any(Array)
            });
        });
    });

    describe('API Response Structure Validation', () => {
        it('should maintain consistent error response structure', async () => {
            // Test POST endpoint error format
            const postEvent: APIGatewayProxyEvent = {
                httpMethod: 'POST',
                path: '/appointments',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: null,
                queryStringParameters: null,
                body: '{}', // Empty body to trigger validation
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'contract-validation-post-test'
                } as any,
                resource: '/appointments',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            const postResult = await postAppointmentHandler(postEvent, mockContext, _mockCallback) as APIGatewayProxyResult;
            const postBody = JSON.parse(postResult.body);

            // Test GET endpoint error format
            const getEvent: APIGatewayProxyEvent = {
                httpMethod: 'GET',
                path: '/appointments/invalid',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: { insuredId: 'invalid' },
                queryStringParameters: null,
                body: null,
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'contract-validation-get-test'
                } as any,
                resource: '/appointments/{insuredId}',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            const getResult = await getAppointmentsHandler(getEvent, mockContext, _mockCallback) as APIGatewayProxyResult;
            const getBody = JSON.parse(getResult.body);

            // Assert consistent error format (both should have error and message fields)
            const expectedErrorFields = ['error', 'message'];
            expectedErrorFields.forEach(field => {
                expect(postBody).toHaveProperty(field);
                expect(getBody).toHaveProperty(field);
            });
        });

        it('should include CORS headers in all responses', async () => {
            const events = [
                {
                    httpMethod: 'POST',
                    path: '/appointments',
                    pathParameters: null,
                    body: JSON.stringify({ insuredId: '12345', scheduleId: 100, countryISO: 'PE' })
                },
                {
                    httpMethod: 'GET',
                    path: '/appointments/12345',
                    pathParameters: { insuredId: '12345' },
                    body: null
                }
            ];

            for (const eventData of events) {
                const event: APIGatewayProxyEvent = {
                    ...eventData,
                    headers: { 'Content-Type': 'application/json' },
                    queryStringParameters: null,
                    isBase64Encoded: false,
                    requestContext: {
                        requestId: `cors-test-${eventData.httpMethod.toLowerCase()}`
                    } as any,
                    resource: eventData.path,
                    stageVariables: null,
                    multiValueHeaders: {},
                    multiValueQueryStringParameters: null,
                };

                const handler = eventData.httpMethod === 'POST' ? postAppointmentHandler : getAppointmentsHandler;
                const result = await handler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

                // Assert CORS headers are present
                expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
                expect(result.headers).toHaveProperty('Content-Type');
                expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
            }
        });
    });

    describe('Handler Error Resilience', () => {
        it('should handle missing path parameters gracefully', async () => {
            const event: APIGatewayProxyEvent = {
                httpMethod: 'GET',
                path: '/appointments/',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: null, // Missing pathParameters
                queryStringParameters: null,
                body: null,
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'missing-path-params-test'
                } as any,
                resource: '/appointments/{insuredId}',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            const result = await getAppointmentsHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Should handle missing path parameters with validation error
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toHaveProperty('error');
            expect(responseBody).toHaveProperty('message');
        });

        it('should handle empty request body gracefully for POST', async () => {
            const event: APIGatewayProxyEvent = {
                httpMethod: 'POST',
                path: '/appointments',
                headers: { 'Content-Type': 'application/json' },
                pathParameters: null,
                queryStringParameters: null,
                body: null, // No body
                isBase64Encoded: false,
                requestContext: {
                    requestId: 'empty-body-test'
                } as any,
                resource: '/appointments',
                stageVariables: null,
                multiValueHeaders: {},
                multiValueQueryStringParameters: null,
            };

            const result = await postAppointmentHandler(event, mockContext, _mockCallback) as APIGatewayProxyResult;

            // Should handle empty body with validation error
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toMatchObject({
                error: 'ValidationError',
                message: 'Invalid request data'
            });
        });
    });
});
