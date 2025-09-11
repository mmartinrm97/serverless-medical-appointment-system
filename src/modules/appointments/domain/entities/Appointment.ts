/**
 * Appointment domain entity
 * Represents a medical appointment in the system
 */

import { generateUlid, isValidUlid } from '@/shared/domain/utils/index.js';
import { DomainError, ValidationError } from '@/shared/domain/errors/index.js';

/**
 * Valid appointment status values
 */
export type AppointmentStatus = 'pending' | 'completed' | 'failed';

/**
 * Valid country ISO codes
 */
export type CountryISO = 'PE' | 'CL';

/**
 * Appointment entity properties
 */
export interface AppointmentProps {
  appointmentId: string;
  insuredId: string;
  scheduleId: number;
  countryISO: CountryISO;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
  // Optional schedule details (can be populated later)
  centerId?: number;
  specialtyId?: number;
  medicId?: number;
  slotDatetime?: Date;
}

/**
 * Appointment domain entity
 *
 * @example
 * ```typescript
 * const appointment = Appointment.create({
 *   insuredId: "12345",
 *   scheduleId: 100,
 *   countryISO: "PE"
 * });
 * ```
 */
export class Appointment {
  private constructor(private readonly props: AppointmentProps) {
    this.validate();
  }

  /**
   * Create a new appointment with generated ID
   *
   * @param data - Appointment creation data
   * @returns New Appointment instance
   */
  public static create(data: {
    insuredId: string;
    scheduleId: number;
    countryISO: CountryISO;
    centerId?: number;
    specialtyId?: number;
    medicId?: number;
    slotDatetime?: Date;
  }): Appointment {
    const now = new Date();

    return new Appointment({
      appointmentId: generateUlid(),
      insuredId: data.insuredId,
      scheduleId: data.scheduleId,
      countryISO: data.countryISO,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      centerId: data.centerId,
      specialtyId: data.specialtyId,
      medicId: data.medicId,
      slotDatetime: data.slotDatetime,
    });
  }

  /**
   * Reconstruct appointment from persistence
   *
   * @param props - Complete appointment properties
   * @returns Appointment instance
   */
  public static fromPersistence(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  /**
   * Mark appointment as completed
   *
   * @returns New appointment instance with completed status
   */
  public markAsCompleted(): Appointment {
    if (this.props.status === 'completed') {
      throw new DomainError(
        'Appointment is already completed',
        'ALREADY_COMPLETED',
        { appointmentId: this.props.appointmentId }
      );
    }

    return new Appointment({
      ...this.props,
      status: 'completed',
      updatedAt: new Date(),
    });
  }

  /**
   * Mark appointment as failed
   *
   * @returns New appointment instance with failed status
   */
  public markAsFailed(): Appointment {
    if (this.props.status === 'completed') {
      throw new DomainError(
        'Cannot mark completed appointment as failed',
        'CANNOT_FAIL_COMPLETED',
        { appointmentId: this.props.appointmentId }
      );
    }

    return new Appointment({
      ...this.props,
      status: 'failed',
      updatedAt: new Date(),
    });
  }

  /**
   * Check if appointment is pending
   */
  public isPending(): boolean {
    return this.props.status === 'pending';
  }

  /**
   * Check if appointment is completed
   */
  public isCompleted(): boolean {
    return this.props.status === 'completed';
  }

  /**
   * Check if appointment is failed
   */
  public isFailed(): boolean {
    return this.props.status === 'failed';
  }

  /**
   * Validate appointment properties
   */
  private validate(): void {
    // Validate appointment ID
    if (!isValidUlid(this.props.appointmentId)) {
      throw new ValidationError('Invalid appointment ID format', {
        appointmentId: this.props.appointmentId,
      });
    }

    // Validate insured ID (5 digits)
    if (!/^\d{5}$/.test(this.props.insuredId)) {
      throw new ValidationError('Insured ID must be exactly 5 digits', {
        insuredId: this.props.insuredId,
      });
    }

    // Validate schedule ID
    if (this.props.scheduleId <= 0) {
      throw new ValidationError('Schedule ID must be a positive number', {
        scheduleId: this.props.scheduleId,
      });
    }

    // Validate country ISO
    if (!['PE', 'CL'].includes(this.props.countryISO)) {
      throw new ValidationError('Country ISO must be PE or CL', {
        countryISO: this.props.countryISO,
      });
    }
  }

  // Getters for accessing properties
  public get appointmentId(): string {
    return this.props.appointmentId;
  }

  public get insuredId(): string {
    return this.props.insuredId;
  }

  public get scheduleId(): number {
    return this.props.scheduleId;
  }

  public get countryISO(): CountryISO {
    return this.props.countryISO;
  }

  public get status(): AppointmentStatus {
    return this.props.status;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public get centerId(): number | undefined {
    return this.props.centerId;
  }

  public get specialtyId(): number | undefined {
    return this.props.specialtyId;
  }

  public get medicId(): number | undefined {
    return this.props.medicId;
  }

  public get slotDatetime(): Date | undefined {
    return this.props.slotDatetime;
  }

  /**
   * Get all properties (for persistence)
   */
  public toProps(): AppointmentProps {
    return { ...this.props };
  }

  /**
   * Convert to plain object for API responses
   */
  public toJSON(): Record<string, unknown> {
    return {
      appointmentId: this.props.appointmentId,
      insuredId: this.props.insuredId,
      scheduleId: this.props.scheduleId,
      countryISO: this.props.countryISO,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      centerId: this.props.centerId,
      specialtyId: this.props.specialtyId,
      medicId: this.props.medicId,
      slotDatetime: this.props.slotDatetime?.toISOString(),
    };
  }
}
