import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
} from '@aws-sdk/client-sqs';
import { createLogger } from '../../../../shared/infrastructure/logging/logger.js';

const logger = createLogger({ module: 'sqsUtils' });

// Initialize SQS client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
});

/**
 * Message priority levels
 */
export type MessagePriority = 'high' | 'normal' | 'low';

/**
 * Standard message attributes for SQS messages
 */
export interface MessageAttributes {
  [key: string]: {
    DataType: 'String' | 'Number' | 'Binary';
    StringValue?: string;
    BinaryValue?: Uint8Array;
  };
}

/**
 * Standard SQS message structure
 */
export interface SQSMessage {
  body: string;
  messageAttributes?: MessageAttributes;
  delaySeconds?: number;
  messageGroupId?: string; // For FIFO queues
  messageDeduplicationId?: string; // For FIFO queues
}

/**
 * Batch message structure for SQS
 */
export interface SQSBatchMessage extends SQSMessage {
  id: string; // Unique ID for the message in the batch
}

/**
 * Sends a single message to an SQS queue
 *
 * @param queueUrl - SQS queue URL
 * @param message - Message to send
 * @returns Promise with message result
 */
export const sendMessage = async (
  queueUrl: string,
  message: SQSMessage
): Promise<{ messageId: string; md5OfBody: string }> => {
  const messageLogger = logger.child({ queueUrl });

  try {
    messageLogger.info('Sending message to SQS queue');

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: message.body,
      MessageAttributes: message.messageAttributes,
      DelaySeconds: message.delaySeconds,
      MessageGroupId: message.messageGroupId,
      MessageDeduplicationId: message.messageDeduplicationId,
    });

    const result = await sqsClient.send(command);

    messageLogger.info('Message sent successfully');

    return {
      messageId: result.MessageId!,
      md5OfBody: result.MD5OfMessageBody!,
    };
  } catch (error) {
    messageLogger.error('Failed to send message to SQS queue');
    throw error;
  }
};

/**
 * Sends multiple messages to an SQS queue in batches
 *
 * @param queueUrl - SQS queue URL
 * @param messages - Array of messages to send (max 10 per batch)
 * @returns Promise with batch results
 */
export const sendMessageBatch = async (
  queueUrl: string,
  messages: SQSBatchMessage[]
): Promise<Array<{ id: string; messageId: string; md5OfBody: string }>> => {
  const batchLogger = logger.child({
    queueUrl,
    messageCount: messages.length,
  });

  if (messages.length === 0) {
    batchLogger.warn('No messages to send');
    return [];
  }

  if (messages.length > 10) {
    throw new Error('SQS batch size cannot exceed 10 messages');
  }

  try {
    batchLogger.info('Sending message batch to SQS queue');

    const command = new SendMessageBatchCommand({
      QueueUrl: queueUrl,
      Entries: messages.map(msg => ({
        Id: msg.id,
        MessageBody: msg.body,
        MessageAttributes: msg.messageAttributes,
        DelaySeconds: msg.delaySeconds,
        MessageGroupId: msg.messageGroupId,
        MessageDeduplicationId: msg.messageDeduplicationId,
      })),
    });

    const result = await sqsClient.send(command);

    const successful = result.Successful ?? [];
    const failed = result.Failed ?? [];

    if (failed.length > 0) {
      const failLogger = batchLogger.child({
        failedCount: failed.length,
        successfulCount: successful.length,
      });
      failLogger.warn('Some messages failed to send');
    } else {
      batchLogger.info('All messages sent successfully');
    }

    return successful.map(msg => ({
      id: msg.Id!,
      messageId: msg.MessageId!,
      md5OfBody: msg.MD5OfMessageBody!,
    }));
  } catch (error) {
    batchLogger.error('Failed to send message batch to SQS queue');
    throw error;
  }
};

/**
 * Creates message attributes for appointment processing
 *
 * @param appointmentId - Appointment ID
 * @param countryISO - Country code
 * @param priority - Message priority (optional)
 * @returns MessageAttributes object
 */
export const createAppointmentMessageAttributes = (
  appointmentId: string,
  countryISO: 'PE' | 'CL',
  priority?: MessagePriority
): MessageAttributes => {
  const attributes: MessageAttributes = {
    appointmentId: {
      DataType: 'String',
      StringValue: appointmentId,
    },
    countryISO: {
      DataType: 'String',
      StringValue: countryISO,
    },
  };

  if (priority) {
    attributes.priority = {
      DataType: 'String',
      StringValue: priority,
    };
  }

  return attributes;
};

/**
 * Creates a standardized SQS message for pending appointment processing
 *
 * @param payload - Appointment payload
 * @param priority - Message priority
 * @param delaySeconds - Delay before processing
 * @returns SQSMessage object
 */
export const createPendingAppointmentMessage = (
  payload: {
    appointmentId: string;
    insuredId: string;
    countryISO: 'PE' | 'CL';
    scheduleId: string;
    centerId: string;
    specialtyId: string;
    medicId: string;
    timestamp: string;
  },
  priority: MessagePriority = 'normal',
  delaySeconds?: number
): SQSMessage => {
  return {
    body: JSON.stringify(payload),
    messageAttributes: createAppointmentMessageAttributes(
      payload.appointmentId,
      payload.countryISO,
      priority
    ),
    delaySeconds,
  };
};

/**
 * Creates a standardized SQS message for completed appointment processing
 *
 * @param payload - Completed appointment payload
 * @param priority - Message priority
 * @returns SQSMessage object
 */
export const createCompletedAppointmentMessage = (
  payload: {
    appointmentId: string;
    insuredId: string;
    countryISO: 'PE' | 'CL';
    scheduleId: string;
    centerId: string;
    specialtyId: string;
    medicId: string;
    completedAt: string;
    processingResult: {
      success: boolean;
      processedAt: string;
      details?: Record<string, unknown>;
    };
  },
  priority: MessagePriority = 'normal'
): SQSMessage => {
  return {
    body: JSON.stringify(payload),
    messageAttributes: createAppointmentMessageAttributes(
      payload.appointmentId,
      payload.countryISO,
      priority
    ),
  };
};
