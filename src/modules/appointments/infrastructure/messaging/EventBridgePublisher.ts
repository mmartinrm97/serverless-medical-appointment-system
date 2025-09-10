import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import type { IEventPublisher } from '../../domain/services/IEventPublisher.js';
import type { AppointmentConfirmedEvent } from '../../domain/events/AppointmentConfirmed.js';
import { EventMapper } from './EventMapper.js';
import { InfrastructureError } from '../../../../shared/domain/errors/index.js';
import { createLogger } from '../../../../shared/infrastructure/logging/logger.js';

/**
 * EventBridge implementation of the event publisher interface.
 * 
 * Publishes domain events to AWS EventBridge for downstream processing.
 * Used by country-specific lambdas to notify appointment completion.
 */
export class EventBridgePublisher implements IEventPublisher {
    private readonly eventBridgeClient: EventBridgeClient;
    private readonly eventBusName: string;
    private readonly mapper: EventMapper;
    private readonly logger = createLogger({ component: 'EventBridgePublisher' });

    /**
     * Creates a new EventBridge publisher instance.
     * 
     * @param region - AWS region for EventBridge client
     * @param eventBusName - Name of the EventBridge event bus
     */
    constructor(
        region: string = process.env.AWS_REGION ?? 'us-east-1',
        eventBusName: string = process.env.EVENT_BUS_NAME ?? 'default'
    ) {
        this.eventBridgeClient = new EventBridgeClient({ region });
        this.eventBusName = eventBusName;
        this.mapper = new EventMapper();

        this.logger.info(`EventBridge publisher initialized for bus: ${this.eventBusName}`);
    }

    /**
     * Publishes an appointment confirmed event to EventBridge.
     * 
     * @param event - The appointment confirmed event to publish
     * @throws {InfrastructureError} When event publishing fails
     */
    async publishAppointmentConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
        try {
            const eventBridgeEvent = this.mapper.toEventBridgeEvent(event);

            const command = new PutEventsCommand({
                Entries: [
                    {
                        Source: eventBridgeEvent.source,
                        DetailType: eventBridgeEvent.detailType,
                        Detail: JSON.stringify(eventBridgeEvent.detail),
                        EventBusName: this.eventBusName,
                        Time: new Date(),
                    },
                ],
            });

            const result = await this.eventBridgeClient.send(command);

            // Check if any events failed to publish
            if (result.FailedEntryCount && result.FailedEntryCount > 0) {
                const failedEntries = result.Entries?.filter(entry => entry.ErrorCode) ?? [];
                const errorMessage = `Failed to publish ${result.FailedEntryCount} events: ${JSON.stringify(failedEntries)}`;

                this.logger.error(`EventBridge publish failed: ${errorMessage}`);
                throw new InfrastructureError('EventBridge publish', errorMessage);
            }

            this.logger.info(`Published appointment confirmed event: ${event.detail.appointmentId} to EventBridge`);

        } catch (error: unknown) {
            if (error instanceof InfrastructureError) {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to publish event to EventBridge: ${errorMessage} for appointment ${event.detail.appointmentId}`);
            throw new InfrastructureError('EventBridge publish', errorMessage);
        }
    }

    /**
     * Publishes a generic event to EventBridge.
     * 
     * @param eventData - Generic event data to publish
     * @throws {InfrastructureError} When event publishing fails
     */
    async publishEvent(eventData: {
        source: string;
        detailType: string;
        detail: Record<string, unknown>;
    }): Promise<void> {
        try {
            const command = new PutEventsCommand({
                Entries: [
                    {
                        Source: eventData.source,
                        DetailType: eventData.detailType,
                        Detail: JSON.stringify(eventData.detail),
                        EventBusName: this.eventBusName,
                        Time: new Date(),
                    },
                ],
            });

            const result = await this.eventBridgeClient.send(command);

            // Check for failures
            if (result.FailedEntryCount && result.FailedEntryCount > 0) {
                const failedEntries = result.Entries?.filter(entry => entry.ErrorCode) ?? [];
                const errorMessage = `Failed to publish ${result.FailedEntryCount} events: ${JSON.stringify(failedEntries)}`;

                this.logger.error(`EventBridge generic publish failed: ${errorMessage}`);
                throw new InfrastructureError('EventBridge publish', errorMessage);
            }

            this.logger.info(`Published generic event to EventBridge: source=${eventData.source}, detailType=${eventData.detailType}`);

        } catch (error: unknown) {
            if (error instanceof InfrastructureError) {
                throw error;
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to publish generic event to EventBridge: ${errorMessage}`);
            throw new InfrastructureError('EventBridge publish', errorMessage);
        }
    }
}
