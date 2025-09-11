import { Appointment } from '../../../domain/entities/Appointment.js';

/**
 * DynamoDB item structure for appointments table.
 *
 * Represents the data structure stored in DynamoDB.
 * PK = insuredId, SK = appointmentId for efficient queries.
 */
export interface DynamoDBAppointmentItem {
  PK: string; // insuredId (5 digits)
  SK: string; // appointmentId (ULID)
  appointmentId: string; // Duplicate for GSI
  scheduleId: number; // ID del slot
  countryISO: string; // "PE" | "CL"
  status: string; // "pending" | "completed" | "failed"
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  // Optional slot fields
  centerId?: number;
  specialtyId?: number;
  medicId?: number;
  slotDatetime?: string; // ISO timestamp
}

/**
 * Mapper class for converting between Appointment entities and DynamoDB items.
 *
 * Provides bidirectional transformation between domain entities and persistence layer.
 * Handles the mapping of Clean Architecture entities to DynamoDB-specific format.
 */
export class AppointmentMapper {
  /**
   * Converts an Appointment entity to a DynamoDB item.
   *
   * @param appointment - The domain entity to convert
   * @returns DynamoDB item ready for persistence
   */
  toItem(appointment: Appointment): DynamoDBAppointmentItem {
    return {
      PK: appointment.insuredId,
      SK: appointment.appointmentId,
      appointmentId: appointment.appointmentId, // For GSI queries
      scheduleId: appointment.scheduleId,
      countryISO: appointment.countryISO,
      status: appointment.status,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      // Optional fields from slot data
      centerId: appointment.centerId,
      specialtyId: appointment.specialtyId,
      medicId: appointment.medicId,
      slotDatetime: appointment.slotDatetime?.toISOString(),
    };
  }

  /**
   * Converts a DynamoDB item to an Appointment entity.
   *
   * @param item - The DynamoDB item to convert
   * @returns Domain entity
   * @throws {Error} When required fields are missing
   */
  toEntity(item: DynamoDBAppointmentItem): Appointment {
    // Validate required fields
    if (!item.PK || !item.SK || !item.scheduleId || !item.countryISO) {
      throw new Error('Invalid DynamoDB item: missing required fields');
    }

    // Reconstruct appointment from persistence data
    return Appointment.fromPersistence({
      appointmentId: item.SK,
      insuredId: item.PK,
      scheduleId: item.scheduleId,
      countryISO: item.countryISO as 'PE' | 'CL',
      status: (item.status ?? 'pending') as 'pending' | 'completed' | 'failed',
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      // Optional slot fields
      centerId: item.centerId,
      specialtyId: item.specialtyId,
      medicId: item.medicId,
      slotDatetime: item.slotDatetime ? new Date(item.slotDatetime) : undefined,
    });
  }

  /**
   * Converts an array of DynamoDB items to Appointment entities.
   *
   * @param items - Array of DynamoDB items
   * @returns Array of domain entities
   */
  toEntities(items: DynamoDBAppointmentItem[]): Appointment[] {
    return items.map(item => this.toEntity(item));
  }

  /**
   * Validates that a DynamoDB item has all required fields.
   *
   * @param item - The item to validate
   * @returns True if valid, false otherwise
   */
  isValidItem(item: unknown): item is DynamoDBAppointmentItem {
    return !!(
      item &&
      typeof item === 'object' &&
      'PK' in item &&
      'SK' in item &&
      'scheduleId' in item &&
      'countryISO' in item &&
      typeof (item as DynamoDBAppointmentItem).PK === 'string' &&
      typeof (item as DynamoDBAppointmentItem).SK === 'string' &&
      typeof (item as DynamoDBAppointmentItem).scheduleId === 'number' &&
      typeof (item as DynamoDBAppointmentItem).countryISO === 'string' &&
      ((item as DynamoDBAppointmentItem).countryISO === 'PE' ||
        (item as DynamoDBAppointmentItem).countryISO === 'CL')
    );
  }
}
