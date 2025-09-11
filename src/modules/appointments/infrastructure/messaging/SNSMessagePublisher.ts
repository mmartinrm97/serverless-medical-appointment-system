import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import type { IEventPublisher } from '../../domain/services/IEventPublisher.js';
import type { AppointmentConfirmedEvent } from '../../domain/events/AppointmentConfirmed.js';
import { InfrastructureError } from '@/shared/domain/errors/index.js';
import { createLogger } from '@/shared/infrastructure/logging/logger.js';
import { MessageMapper } from './MessageMapper.js';

/**
 * SNS implementation of the event publisher interface.
 *
 * Publishes appointment messages to SNS topic with message attributes for country filtering.
 * The SNS topic has subscriptions to country-specific SQS queues using filter policies.
 */
export class SNSMessagePublisher implements IEventPublisher {
  private readonly snsClient: SNSClient;
  private readonly topicArn: string;
  private readonly messageMapper: MessageMapper;
  private readonly logger = createLogger({ component: 'SNSMessagePublisher' });

  /**
   * Creates a new SNS message publisher instance.
   *
   * @param config - Configuration object
   * @param config.topicArn - ARN of the SNS topic to publish to
   * @param config.region - AWS region for SNS client (optional, defaults to 'us-east-1')
   */
  constructor({
    topicArn,
    region = 'us-east-1',
  }: {
    topicArn: string;
    region?: string;
  }) {
    // Debug logging
    this.logger = createLogger({ component: 'SNSMessagePublisher' });
    this.logger.debug(
      `Constructor called with topicArn: ${JSON.stringify(topicArn)}, type: ${typeof topicArn}`
    );

    // Configure SNS client with LocalStack endpoint if available
    const clientConfig = {
      region,
      ...(process.env.AWS_ENDPOINT_URL && {
        endpoint: process.env.AWS_ENDPOINT_URL,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      }),
    };

    this.snsClient = new SNSClient(clientConfig);
    this.topicArn = topicArn;
    this.messageMapper = new MessageMapper();

    this.logger.info(
      `SNS Message Publisher initialized for topic: ${topicArn}`
    );
  }

  /**
   * Publishes an appointment confirmed event to SNS.
   *
   * @param event - The appointment confirmed event to publish
   * @throws {InfrastructureError} When SNS publish operation fails
   */
  async publishAppointmentConfirmed(
    event: AppointmentConfirmedEvent
  ): Promise<void> {
    try {
      const snsMessage = this.messageMapper.toSNSMessage(event);

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: snsMessage.subject,
        Message: snsMessage.message,
        MessageAttributes: snsMessage.messageAttributes,
      });

      const result = await this.snsClient.send(command);

      this.logger.info(
        `Appointment confirmed event published to SNS: ${result.MessageId} for appointment ${event.detail.appointmentId}`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to publish appointment confirmed event to SNS: ${errorMessage} for appointment ${event.detail.appointmentId}`
      );

      throw new InfrastructureError(
        'SNS publish appointment confirmed',
        errorMessage,
        {
          appointmentId: event.detail.appointmentId,
          countryISO: event.detail.countryISO,
        }
      );
    }
  }

  /**
   * Publishes a generic event to SNS.
   * Used by the CreateAppointment use case to publish appointment creation events.
   *
   * @param eventData - Generic event data to publish
   * @throws {InfrastructureError} When SNS publish operation fails
   */
  async publishEvent(eventData: {
    source: string;
    detailType: string;
    detail: Record<string, unknown>;
  }): Promise<void> {
    try {
      // Extract country from event detail for message attributes
      const countryISO = eventData.detail.countryISO as string;

      if (!countryISO || !['PE', 'CL'].includes(countryISO)) {
        throw new Error('Invalid or missing countryISO in event detail');
      }

      const snsMessage = this.messageMapper.toSNSGenericMessage(
        eventData,
        countryISO
      );

      this.logger.debug(
        `SNS message prepared - Topic: ${this.topicArn}, Subject: ${snsMessage.subject}`
      );
      this.logger.debug(
        `Message attributes: ${JSON.stringify(snsMessage.messageAttributes)}`
      );

      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: snsMessage.subject,
        Message: snsMessage.message,
        MessageAttributes: snsMessage.messageAttributes,
      });

      this.logger.debug(`Sending SNS command to topic: ${this.topicArn}`);

      const result = await this.snsClient.send(command);

      this.logger.info(
        `Generic event published to SNS: ${result.MessageId} for ${eventData.source}/${eventData.detailType} (${countryISO})`
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to publish generic event to SNS: ${errorMessage} for ${eventData.source}/${eventData.detailType}`
      );

      throw new InfrastructureError('SNS publish generic event', errorMessage, {
        source: eventData.source,
        detailType: eventData.detailType,
      });
    }
  }

  /**
   * Health check method to verify SNS connectivity.
   * Can be used for monitoring and diagnostics.
   *
   * @returns Promise that resolves if SNS is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple check by listing topic attributes
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: 'Health Check',
        Message: JSON.stringify({
          type: 'health-check',
          timestamp: new Date().toISOString(),
        }),
        MessageAttributes: {
          type: {
            DataType: 'String',
            StringValue: 'health-check',
          },
        },
      });

      await this.snsClient.send(command);
      this.logger.debug('SNS health check passed');
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`SNS health check failed: ${errorMessage}`);
      return false;
    }
  }
}
