/**
 * Integration Tests for Medical Appointments API
 *
 * These tests validate the complete API flow from HTTP requests to responses,
 * focusing on handler integration with mocked AWS services.
 *
 * Purpose: Fast feedback during development with proper error handling validation.
 * Complement: E2E tests provide full system validation against real services.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handler as postAppointmentHandler } from '@/modules/appointments/interfaces/http/postAppointment.js';
import { handler as getAppointmentsHandler } from '@/modules/appointments/interfaces/http/getAppointments.js';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

describe('API Integration Tests', () => {
  let mockContext: Context;

  beforeEach(() => {
    // Setup environment variables for integration tests
    process.env.AWS_REGION = 'us-east-1';
    process.env.APPOINTMENTS_TABLE = 'appointments-test';
    process.env.SNS_TOPIC_ARN =
      'arn:aws:sns:us-east-1:123456789012:appointment-notifications-test';

    // Setup mock Lambda context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '$LATEST',
      invokedFunctionArn:
        'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-integration-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2024/01/01/[$LATEST]integration-test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };
  });

  describe('POST /appointments - Handler Integration', () => {
    it('should handle validation errors properly', async () => {
      // Arrange - Invalid request body
      const invalidRequestBody = {
        insuredId: '123', // Too short
        scheduleId: -1, // Negative
        countryISO: 'US', // Invalid country
      };

      const event: APIGatewayProxyEvent = createAPIGatewayEvent(
        'POST',
        '/appointments',
        invalidRequestBody
      );

      // Act
      const result = (await postAppointmentHandler(
        event,
        mockContext,
        () => {}
      )) as APIGatewayProxyResult;

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'ValidationError',
        message: 'Invalid request data',
      });
    });

    it('should handle malformed JSON properly', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        ...createAPIGatewayEvent('POST', '/appointments'),
        body: '{ invalid json',
      };

      // Act
      const result = (await postAppointmentHandler(
        event,
        mockContext,
        () => {}
      )) as APIGatewayProxyResult;

      // Assert
      expect(result.statusCode).toBe(500); // Malformed JSON causes internal error
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('InternalServerError');
    });

    it('should handle infrastructure errors gracefully', async () => {
      // Arrange - Valid request that will fail due to mocked AWS services
      const validRequestBody = {
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
      };

      const event: APIGatewayProxyEvent = createAPIGatewayEvent(
        'POST',
        '/appointments',
        validRequestBody
      );

      // Act
      const result = (await postAppointmentHandler(
        event,
        mockContext,
        () => {}
      )) as APIGatewayProxyResult;

      // Assert - Should handle AWS service errors gracefully
      expect([500, 502, 503]).toContain(result.statusCode);
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
    });
  });

  describe('GET /appointments/{insuredId} - Handler Integration', () => {
    it('should handle invalid insuredId validation', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = createAPIGatewayEvent(
        'GET',
        '/appointments/123'
      ); // Invalid insuredId

      // Act
      const result = (await getAppointmentsHandler(
        event,
        mockContext,
        () => {}
      )) as APIGatewayProxyResult;

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toMatchObject({
        error: 'ValidationError',
        message: 'Invalid request parameters',
      });
    });

    it('should handle missing path parameters gracefully', async () => {
      // Arrange
      const event: APIGatewayProxyEvent = {
        ...createAPIGatewayEvent('GET', '/appointments'),
        pathParameters: null,
      };

      // Act
      const result = (await getAppointmentsHandler(
        event,
        mockContext,
        () => {}
      )) as APIGatewayProxyResult;

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe('ValidationError');
    });
  });

  describe('CORS and Response Structure', () => {
    it('should include CORS headers in all responses', async () => {
      // Test both endpoints for CORS
      const postEvent = createAPIGatewayEvent('POST', '/appointments', {
        invalid: 'data',
      });
      const getEvent = createAPIGatewayEvent('GET', '/appointments/123');

      const [postResult, getResult] = (await Promise.all([
        postAppointmentHandler(postEvent, mockContext, () => {}),
        getAppointmentsHandler(getEvent, mockContext, () => {}),
      ])) as APIGatewayProxyResult[];

      // Both should have CORS headers
      for (const result of [postResult, getResult]) {
        expect(result.headers).toMatchObject({
          'Access-Control-Allow-Origin': '*',
        });
        expect(result.headers).toHaveProperty(
          'Content-Type',
          'application/json'
        );
      }
    });

    it('should maintain consistent error response structure', async () => {
      // Test multiple error scenarios
      const scenarios = [
        createAPIGatewayEvent('POST', '/appointments', { invalid: 'data' }),
        createAPIGatewayEvent('GET', '/appointments/123'),
        {
          ...createAPIGatewayEvent('POST', '/appointments'),
          body: '{ malformed',
        },
      ];

      for (const event of scenarios) {
        const result = (await (event.path.includes('appointments/123')
          ? getAppointmentsHandler(event, mockContext, () => {})
          : postAppointmentHandler(
              event,
              mockContext,
              () => {}
            ))) as APIGatewayProxyResult;

        expect(result.statusCode).toBeGreaterThanOrEqual(400);

        const responseBody = JSON.parse(result.body);
        expect(responseBody).toHaveProperty('error');
        expect(responseBody).toHaveProperty('message');
        expect(typeof responseBody.error).toBe('string');
        expect(typeof responseBody.message).toBe('string');
      }
    });
  });
});

/**
 * Helper function to create API Gateway events
 */
function createAPIGatewayEvent(
  method: string,
  path: string,
  body?: any
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    path,
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://medical-app.com',
    },
    pathParameters: path.includes('/appointments/')
      ? {
          insuredId: path.split('/').pop() ?? '',
        }
      : null,
    queryStringParameters: null,
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    requestContext: {
      requestId: 'integration-test-request-id',
      accountId: '123456789012',
      apiId: 'test-api-id',
      stage: 'test',
      requestTime: '10/Jan/2024:08:00:00 +0000',
      requestTimeEpoch: 1704873600000,
      resourceId: 'test-resource-id',
      resourcePath: path,
      httpMethod: method,
      identity: {
        sourceIp: '192.168.1.100',
        userAgent: 'Integration-Test-Client/1.0',
      } as any,
      protocol: 'HTTP/1.1',
      routeKey: `${method} ${path}`,
      eventType: 'REQUEST',
      operationName: `${method} ${path}`,
      domainName: 'test-api.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test-api',
    } as any,
    resource: path,
    stageVariables: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  };
}
