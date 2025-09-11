// Setup file for Vitest tests
import { vi } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn(),
  })),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn();
  const MockDynamoDBDocumentClient = {
    from: vi.fn(() => ({
      send: mockSend,
    })),
  };

  return {
    DynamoDBDocumentClient: MockDynamoDBDocumentClient,
    PutCommand: vi.fn(),
    GetCommand: vi.fn(),
    QueryCommand: vi.fn(),
    UpdateCommand: vi.fn(),
  };
});

vi.mock('@aws-sdk/client-sns', () => {
  const mockSend = vi.fn();
  const MockSNSClient = vi.fn(() => ({
    send: mockSend,
  }));

  return {
    SNSClient: MockSNSClient,
    PublishCommand: vi.fn(),
    GetTopicAttributesCommand: vi.fn(),
  };
});

vi.mock('@aws-sdk/client-eventbridge', () => {
  const mockSend = vi.fn();
  const MockEventBridgeClient = vi.fn(() => ({
    send: mockSend,
  }));

  return {
    EventBridgeClient: MockEventBridgeClient,
    PutEventsCommand: vi.fn(),
  };
});

// Mock MySQL2
vi.mock('mysql2/promise', () => ({
  createConnection: vi.fn(),
  createPool: vi.fn(),
}));

// Mock ULID
vi.mock('ulid', () => ({
  ulid: vi.fn(() => '01234567890123456789012345'),
}));

// Global test configuration
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.APPOINTMENTS_TABLE = 'appointments';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
process.env.SQS_PE_URL =
  'https://sqs.us-east-1.amazonaws.com/123456789012/test-pe-queue';
process.env.SQS_CL_URL =
  'https://sqs.us-east-1.amazonaws.com/123456789012/test-cl-queue';
process.env.SQS_COMPLETION_URL =
  'https://sqs.us-east-1.amazonaws.com/123456789012/test-completion-queue';
process.env.EVENTBRIDGE_BUS = 'test-medical-appointments-bus';
