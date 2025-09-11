/**
 * Event publisher interface
 * Defines contract for publishing domain events
 */

import type { AppointmentConfirmedEvent } from '../events/AppointmentConfirmed.js';

/**
 * Interface for publishing domain events to EventBridge
 */
export interface IEventPublisher {
  /**
   * Publish appointment confirmed event
   *
   * @param event - AppointmentConfirmed event to publish
   * @returns Promise that resolves when event is published
   */
  publishAppointmentConfirmed(_event: AppointmentConfirmedEvent): Promise<void>;

  /**
   * Publish generic event to EventBridge
   *
   * @param eventData - Event data to publish
   * @returns Promise that resolves when event is published
   */
  publishEvent(_eventData: {
    source: string;
    detailType: string;
    detail: Record<string, unknown>;
  }): Promise<void>;
}
