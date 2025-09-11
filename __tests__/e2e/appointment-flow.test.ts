/**
 * End-to-End Tests for Medical Appointments API
 *
 * Tests the complete appointment workflow using LocalStack:
 * 1. POST /appointments → DynamoDB → SNS → SQS
 * 2. GET /appointments → DynamoDB
 * 3. SNS filtering by country
 * 4. Idempotency validation
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient, GetTopicAttributesCommand } from '@aws-sdk/client-sns';
import {
  SQSClient,
  ReceiveMessageCommand,
  PurgeQueueCommand,
} from '@aws-sdk/client-sqs';
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  localStackEndpoint: 'http://localhost:4566',
  region: 'us-east-1',
  tableName: 'medical-appointments-api-appointments-dev',
  snsTopicArn:
    'arn:aws:sns:us-east-1:000000000000:medical-appointments-api-appointment-notifications-dev',
  sqsQueues: {
    pe: 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/medical-appointments-api-appointment-pe-dev',
    cl: 'http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/medical-appointments-api-appointment-cl-dev',
  },
};

// AWS Clients for LocalStack
const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: TEST_CONFIG.region,
    endpoint: TEST_CONFIG.localStackEndpoint,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  })
);

const snsClient = new SNSClient({
  region: TEST_CONFIG.region,
  endpoint: TEST_CONFIG.localStackEndpoint,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

const sqsClient = new SQSClient({
  region: TEST_CONFIG.region,
  endpoint: TEST_CONFIG.localStackEndpoint,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

/**
 * HTTP client helper for API calls
 */
async function apiRequest(
  method: string,
  path: string,
  body?: any
): Promise<{
  status: number;
  data: any;
  headers: Headers;
}> {
  const url = `${TEST_CONFIG.baseUrl}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  return {
    status: response.status,
    data: response.status !== 204 ? await response.json() : null,
    headers: response.headers,
  };
}

/**
 * Wait for SQS message with timeout
 */
async function waitForSQSMessage(
  queueUrl: string,
  timeoutMs: number = 10000
): Promise<any[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      })
    );

    if (result.Messages && result.Messages.length > 0) {
      return result.Messages;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return [];
}

/**
 * Clean up SQS queues before each test
 */
async function cleanupQueues() {
  for (const queueUrl of Object.values(TEST_CONFIG.sqsQueues)) {
    try {
      await sqsClient.send(new PurgeQueueCommand({ QueueUrl: queueUrl }));
    } catch {
      // Ignore purge errors - queue might be empty
    }
  }
}

describe('E2E: Medical Appointments API Flow', () => {
  beforeAll(async () => {
    // Verify LocalStack services are running
    try {
      await snsClient.send(
        new GetTopicAttributesCommand({
          TopicArn: TEST_CONFIG.snsTopicArn,
        })
      );
    } catch (error) {
      console.error('Error connecting to LocalStack SNS:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `LocalStack SNS not available. Error: ${errorMessage}. Run "pnpm run local:start" first.`
      );
    }
  });

  beforeEach(async () => {
    // Clean SQS queues before each test
    await cleanupQueues();

    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('POST /appointments - Appointment Creation Flow', () => {
    it('should create PE appointment and route to PE queue', async () => {
      // 1. Create appointment
      const appointmentData = {
        insuredId: '12345',
        countryISO: 'PE',
        scheduleId: 100,
      };

      const createResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        appointmentData
      );

      // 2. Verify API response
      expect(createResponse.status).toBe(201);
      expect(createResponse.data).toMatchObject({
        appointmentId: expect.any(String),
        insuredId: '12345',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'pending',
        createdAt: expect.any(String),
      });

      const { appointmentId } = createResponse.data;

      // 3. Verify appointment in DynamoDB
      const dynamoResult = await dynamoClient.send(
        new GetCommand({
          TableName: TEST_CONFIG.tableName,
          Key: {
            PK: '12345',
            SK: appointmentId,
          },
        })
      );

      expect(dynamoResult.Item).toBeDefined();
      expect(dynamoResult.Item).toMatchObject({
        PK: '12345',
        SK: appointmentId,
        scheduleId: 100,
        countryISO: 'PE',
        status: 'pending',
      });

      // 4. Verify SNS message reached PE queue
      const peMessages = await waitForSQSMessage(TEST_CONFIG.sqsQueues.pe);
      expect(peMessages).toHaveLength(1);

      const messageBody = JSON.parse(peMessages[0].Body);
      expect(messageBody.Message).toContain(appointmentId);
      expect(messageBody.MessageAttributes.countryISO.Value).toBe('PE');

      // 5. Verify CL queue is empty
      const clMessages = await waitForSQSMessage(
        TEST_CONFIG.sqsQueues.cl,
        2000
      );
      expect(clMessages).toHaveLength(0);
    });

    it.skip('should create CL appointment and route to CL queue', async () => {
      // 1. Create appointment
      const appointmentData = {
        insuredId: '54321',
        countryISO: 'CL',
        scheduleId: 200,
      };

      const createResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        appointmentData
      );

      // 2. Verify API response
      expect(createResponse.status).toBe(201);
      expect(createResponse.data.countryISO).toBe('CL');

      // 3. Verify SNS message reached CL queue
      const clMessages = await waitForSQSMessage(TEST_CONFIG.sqsQueues.cl);
      expect(clMessages).toHaveLength(1);

      const messageBody = JSON.parse(clMessages[0].Body);
      expect(messageBody.MessageAttributes.countryISO.Value).toBe('CL');

      // 4. Verify PE queue is empty
      const peMessages = await waitForSQSMessage(
        TEST_CONFIG.sqsQueues.pe,
        2000
      );
      expect(peMessages).toHaveLength(0);
    });

    it.skip('should handle duplicate appointments (idempotency)', async () => {
      const appointmentData = {
        insuredId: '99999',
        countryISO: 'PE',
        scheduleId: 300,
      };

      // 1. Create first appointment
      const firstResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        appointmentData
      );
      expect(firstResponse.status).toBe(201);
      const firstAppointmentId = firstResponse.data.appointmentId;

      // 2. Try to create duplicate
      const duplicateResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        appointmentData
      );
      expect(duplicateResponse.status).toBe(201);

      // Should return same appointment ID (idempotency)
      expect(duplicateResponse.data.appointmentId).toBe(firstAppointmentId);

      // 3. Verify only one record in DynamoDB
      const scanResult = await dynamoClient.send(
        new ScanCommand({
          TableName: TEST_CONFIG.tableName,
          FilterExpression: 'PK = :pk AND scheduleId = :scheduleId',
          ExpressionAttributeValues: {
            ':pk': '99999',
            ':scheduleId': 300,
          },
        })
      );

      expect(scanResult.Items).toHaveLength(1);
    });

    it.skip('should validate input data', async () => {
      // Test invalid insuredId
      const invalidInsuredResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        {
          insuredId: '123', // Too short
          countryISO: 'PE',
          scheduleId: 100,
        }
      );

      expect(invalidInsuredResponse.status).toBe(400);
      expect(invalidInsuredResponse.data.error).toBe('ValidationError');

      // Test invalid countryISO
      const invalidCountryResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        {
          insuredId: '12345',
          countryISO: 'XX', // Invalid country
          scheduleId: 100,
        }
      );

      expect(invalidCountryResponse.status).toBe(400);
      expect(invalidCountryResponse.data.error).toBe('ValidationError');

      // Test invalid scheduleId
      const invalidScheduleResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        {
          insuredId: '12345',
          countryISO: 'PE',
          scheduleId: -1, // Negative number
        }
      );

      expect(invalidScheduleResponse.status).toBe(400);
      expect(invalidScheduleResponse.data.error).toBe('ValidationError');
    });
  });

  describe('GET /appointments/{insuredId} - Appointment Retrieval', () => {
    it.skip('should retrieve appointments for existing insured', async () => {
      // 1. Create test appointment
      const appointmentData = {
        insuredId: '11111',
        countryISO: 'PE',
        scheduleId: 400,
      };

      const createResponse = await apiRequest(
        'POST',
        '/dev/appointments',
        appointmentData
      );
      expect(createResponse.status).toBe(201);
      const { appointmentId } = createResponse.data;

      // 2. Retrieve appointments
      const getResponse = await apiRequest('GET', '/dev/appointments/11111');

      // 3. Verify response
      expect(getResponse.status).toBe(200);
      expect(getResponse.data.appointments).toHaveLength(1);
      expect(getResponse.data.appointments[0]).toMatchObject({
        appointmentId,
        scheduleId: 400,
        countryISO: 'PE',
        status: 'pending',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it.skip('should return empty list for non-existing insured', async () => {
      const getResponse = await apiRequest('GET', '/dev/appointments/00000');

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.appointments).toHaveLength(0);
    });

    it.skip('should validate insuredId format', async () => {
      const invalidResponse = await apiRequest('GET', '/dev/appointments/123');

      expect(invalidResponse.status).toBe(400);
      expect(invalidResponse.data.error).toBe('ValidationError');
    });
  });

  describe('CORS and Headers', () => {
    it.skip('should include CORS headers in responses', async () => {
      const response = await apiRequest('POST', '/dev/appointments', {
        insuredId: '22222',
        countryISO: 'CL',
        scheduleId: 500,
      });

      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });
  });
});
