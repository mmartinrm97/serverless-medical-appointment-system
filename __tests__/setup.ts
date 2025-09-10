// Setup file for Vitest tests
import { vi } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn(),
  })),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn(),
    })),
  },
  PutCommand: vi.fn(),
  GetCommand: vi.fn(),
  QueryCommand: vi.fn(),
  UpdateCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  PublishCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  SendMessageCommand: vi.fn(),
  ReceiveMessageCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutEventsCommand: vi.fn(),
}));

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
process.env.APPOINTMENTS_TABLE = 'test-appointments-table';
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
process.env.SQS_PE_URL =
  'https://sqs.us-east-1.amazonaws.com/123456789012/test-pe-queue';
process.env.SQS_CL_URL =
  'https://sqs.us-east-1.amazonaws.com/123456789012/test-cl-queue';
process.env.SQS_COMPLETION_URL =
  'https://sqs.us-east-1.amazonaws.com/123456789012/test-completion-queue';
process.env.EVENTBRIDGE_BUS = 'test-medical-appointments-bus';
