import type { AppointmentConfirmedEvent } from '../../domain/events/AppointmentConfirmed.js';

/**
 * SNS message structure for appointment events.
 */
export interface SNSMessage {
  subject: string;
  message: string;
  messageAttributes: {
    [key: string]: {
      DataType: 'String' | 'Number' | 'Binary';
      StringValue?: string;
      BinaryValue?: Uint8Array;
    };
  };
}

/**
 * Message mapper for converting domain events to SNS message format.
 *
 * Handles the transformation of domain events into SNS-compatible messages
 * with proper message attributes for filtering by country.
 */
export class MessageMapper {
  /**
   * Converts an AppointmentConfirmed event to SNS message format.
   *
   * @param event - The appointment confirmed event
   * @returns SNS message with country filtering attributes
   */
  toSNSMessage(event: AppointmentConfirmedEvent): SNSMessage {
    return {
      subject: 'Appointment Confirmed',
      message: JSON.stringify({
        eventType: 'AppointmentConfirmed',
        timestamp: new Date().toISOString(),
        source: event.source,
        detailType: event['detail-type'],
        data: event.detail,
      }),
      messageAttributes: {
        countryISO: {
          DataType: 'String',
          StringValue: event.detail.countryISO,
        },
        eventType: {
          DataType: 'String',
          StringValue: 'AppointmentConfirmed',
        },
        source: {
          DataType: 'String',
          StringValue: event.source,
        },
      },
    };
  }

  /**
   * Converts generic event data to SNS message format.
   * Used for appointment creation events from the CreateAppointment use case.
   *
   * @param eventData - Generic event data
   * @param countryISO - Country code for filtering
   * @returns SNS message with country filtering attributes
   */
  toSNSGenericMessage(
    eventData: {
      source: string;
      detailType: string;
      detail: Record<string, unknown>;
    },
    countryISO: string
  ): SNSMessage {
    return {
      subject: `New Appointment - ${countryISO}`,
      message: JSON.stringify({
        eventType: eventData.detailType,
        timestamp: new Date().toISOString(),
        source: eventData.source,
        detailType: eventData.detailType,
        data: eventData.detail,
      }),
      messageAttributes: {
        countryISO: {
          DataType: 'String',
          StringValue: countryISO,
        },
        eventType: {
          DataType: 'String',
          StringValue: eventData.detailType,
        },
        source: {
          DataType: 'String',
          StringValue: eventData.source,
        },
      },
    };
  }

  /**
   * Validates that message attributes contain required country filtering data.
   *
   * @param messageAttributes - SNS message attributes to validate
   * @returns True if valid for country filtering
   */
  validateCountryFilterAttributes(
    messageAttributes: SNSMessage['messageAttributes']
  ): boolean {
    const countryAttr = messageAttributes.countryISO;

    return !!(
      countryAttr &&
      countryAttr.DataType === 'String' &&
      countryAttr.StringValue &&
      ['PE', 'CL'].includes(countryAttr.StringValue)
    );
  }

  /**
   * Creates a test message for health checks or debugging.
   *
   * @param countryISO - Country to test filtering for
   * @returns Test SNS message
   */
  createTestMessage(countryISO: 'PE' | 'CL'): SNSMessage {
    return {
      subject: 'Test Message',
      message: JSON.stringify({
        eventType: 'Test',
        timestamp: new Date().toISOString(),
        source: 'test',
        detailType: 'TestMessage',
        data: {
          countryISO,
          message: 'This is a test message for country filtering',
        },
      }),
      messageAttributes: {
        countryISO: {
          DataType: 'String',
          StringValue: countryISO,
        },
        eventType: {
          DataType: 'String',
          StringValue: 'Test',
        },
        source: {
          DataType: 'String',
          StringValue: 'test',
        },
      },
    };
  }
}
