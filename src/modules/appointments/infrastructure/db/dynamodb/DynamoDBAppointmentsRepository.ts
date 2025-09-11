import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { IAppointmentsRepository } from '../../../domain/repositories/IAppointmentsRepository.js';
import { Appointment } from '../../../domain/entities/Appointment.js';
import {
  InfrastructureError,
  ConflictError,
} from '../../../../../shared/domain/errors/index.js';
import { createLogger } from '../../../../../shared/infrastructure/logging/logger.js';
import {
  AppointmentMapper,
  type DynamoDBAppointmentItem,
} from './AppointmentMapper.js';

/**
 * DynamoDB implementation of the appointments repository.
 *
 * Provides concrete implementation for appointment persistence using AWS DynamoDB.
 * Uses DynamoDB Document Client for simplified operations with native JavaScript types.
 *
 * @implements {IAppointmentsRepository}
 */
export class DynamoDBAppointmentsRepository implements IAppointmentsRepository {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly mapper: AppointmentMapper;
  private readonly logger = createLogger({
    component: 'DynamoDBAppointmentsRepository',
  });

  /**
   * Creates a new DynamoDB appointments repository instance.
   *
   * @param region - AWS region for DynamoDB client
   * @param tableName - Name of the DynamoDB table
   */
  /**
   * Creates a new DynamoDB appointments repository instance.
   *
   * @param config - Configuration object
   * @param config.tableName - Name of the DynamoDB table
   * @param config.region - AWS region (optional, defaults to 'us-east-1')
   */
  constructor({
    tableName,
    region = 'us-east-1',
  }: {
    tableName: string;
    region?: string;
  }) {
    const dynamoDBClient = new DynamoDBClient({ region });
    this.docClient = DynamoDBDocumentClient.from(dynamoDBClient);
    this.tableName = tableName;
    this.mapper = new AppointmentMapper();

    this.logger.info('DynamoDB repository initialized');
  }

  /**
   * Saves an appointment to DynamoDB.
   *
   * @param appointment - The appointment entity to save
   * @throws {ConflictError} When appointment already exists
   * @throws {InfrastructureError} When save operation fails
   */
  async save(appointment: Appointment): Promise<void> {
    try {
      const item = this.mapper.toItem(appointment);

      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
        // Prevent overwriting existing appointments (idempotency)
        ConditionExpression:
          'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      });

      await this.docClient.send(command);

      this.logger.info(
        `Appointment saved successfully: ${appointment.appointmentId} for insured ${appointment.insuredId}`
      );
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        this.logger.warn(
          `Appointment already exists: ${appointment.appointmentId} for insured ${appointment.insuredId}`
        );
        throw new ConflictError('appointment', 'Appointment already exists');
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to save appointment: ${errorMessage} for appointment ${appointment.appointmentId}`
      );
      throw new InfrastructureError('save appointment', errorMessage);
    }
  }

  /**
   * Finds an appointment by its ID.
   *
   * @param appointmentId - The appointment ID to search for
   * @returns The appointment if found, null otherwise
   * @throws {InfrastructureError} When query operation fails
   */
  async findById(appointmentId: string): Promise<Appointment | null> {
    try {
      // We need to use a GSI since we don't have the PK (insuredId)
      // For now, we'll use scan with filter (not optimal for production)
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'AppointmentIdIndex', // Assuming we have a GSI on appointmentId
        KeyConditionExpression: 'appointmentId = :appointmentId',
        ExpressionAttributeValues: {
          ':appointmentId': appointmentId,
        },
      });

      const result = await this.docClient.send(command);

      if (!result.Items || result.Items.length === 0) {
        this.logger.debug(`Appointment not found: ${appointmentId}`);
        return null;
      }

      const appointment = this.mapper.toEntity(
        result.Items[0] as DynamoDBAppointmentItem
      );
      this.logger.debug(`Appointment found: ${appointmentId}`);
      return appointment;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to find appointment by ID: ${appointmentId} - ${errorMessage}`
      );
      throw new InfrastructureError('find appointment by ID', errorMessage);
    }
  }

  /**
   * Finds all appointments for a specific insured user.
   *
   * @param insuredId - The insured user ID (5 digits)
   * @returns Array of appointments for the insured user
   * @throws {InfrastructureError} When query operation fails
   */
  async findByInsuredId(insuredId: string): Promise<Appointment[]> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :insuredId',
        ExpressionAttributeValues: {
          ':insuredId': insuredId,
        },
        // Sort by creation date (SK contains ULID which is time-sortable)
        ScanIndexForward: false, // Latest first
      });

      const result = await this.docClient.send(command);

      if (!result.Items || result.Items.length === 0) {
        this.logger.debug(`No appointments found for insured: ${insuredId}`);
        return [];
      }

      const appointments = result.Items.map(item =>
        this.mapper.toEntity(item as DynamoDBAppointmentItem)
      );

      this.logger.debug(
        `Found ${appointments.length} appointments for insured: ${insuredId}`
      );

      return appointments;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to find appointments by insured ID: ${insuredId} - ${errorMessage}`
      );
      throw new InfrastructureError(
        'find appointments by insured ID',
        errorMessage
      );
    }
  }

  /**
   * Updates the status of an appointment.
   *
   * @param appointmentId - The appointment ID to update
   * @param status - The new status value
   * @returns Updated appointment or null if not found
   * @throws {InfrastructureError} When update operation fails
   */
  async updateStatus(
    appointmentId: string,
    status: 'completed' | 'failed'
  ): Promise<Appointment | null> {
    try {
      // First, we need to find the appointment to get the PK (insuredId)
      const appointment = await this.findById(appointmentId);

      if (!appointment) {
        this.logger.warn(
          `Appointment not found for status update: ${appointmentId}`
        );
        return null;
      }

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: appointment.insuredId,
          SK: appointmentId,
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
        },
        // Ensure the appointment exists before updating
        ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.docClient.send(command);

      if (!result.Attributes) {
        return null;
      }

      const updatedAppointment = this.mapper.toEntity(
        result.Attributes as DynamoDBAppointmentItem
      );

      this.logger.info(
        `Appointment status updated: ${appointmentId} to ${status}`
      );

      return updatedAppointment;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        this.logger.warn(
          `Appointment not found for status update: ${appointmentId}`
        );
        return null;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update appointment status: ${appointmentId} - ${errorMessage}`
      );
      throw new InfrastructureError('update appointment status', errorMessage);
    }
  }

  /**
   * Finds appointment by insured ID and schedule ID.
   * Used for idempotency checks.
   *
   * @param insuredId - The insured user ID
   * @param scheduleId - The schedule ID
   * @returns Existing appointment or null
   * @throws {InfrastructureError} When query operation fails
   */
  async findByInsuredAndSchedule(
    insuredId: string,
    scheduleId: number
  ): Promise<Appointment | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :insuredId',
        FilterExpression: 'scheduleId = :scheduleId',
        ExpressionAttributeValues: {
          ':insuredId': insuredId,
          ':scheduleId': scheduleId,
        },
      });

      const result = await this.docClient.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      return this.mapper.toEntity(result.Items[0] as DynamoDBAppointmentItem);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to find appointment by insured and schedule: ${insuredId}, ${scheduleId} - ${errorMessage}`
      );
      throw new InfrastructureError(
        'find appointment by insured and schedule',
        errorMessage
      );
    }
  }
}
