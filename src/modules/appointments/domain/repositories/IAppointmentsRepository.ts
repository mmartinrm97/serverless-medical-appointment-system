/**
 * Appointments repository interface
 * Defines the contract for persistence operations
 */

import type { Appointment } from '../entities/Appointment.js';

/**
 * Repository interface for appointment persistence
 */
export interface IAppointmentsRepository {
  /**
   * Save a new appointment
   *
   * @param appointment - Appointment to save
   * @returns Promise that resolves when saved
   */
  save(appointment: Appointment): Promise<void>;

  /**
   * Find appointment by ID
   *
   * @param appointmentId - Appointment identifier
   * @returns Promise with appointment or null if not found
   */
  findById(appointmentId: string): Promise<Appointment | null>;

  /**
   * Find all appointments for an insured user
   *
   * @param insuredId - Insured user identifier
   * @returns Promise with array of appointments
   */
  findByInsuredId(insuredId: string): Promise<Appointment[]>;

  /**
   * Update appointment status
   *
   * @param appointmentId - Appointment identifier
   * @param status - New status
   * @returns Promise with updated appointment or null if not found
   */
  updateStatus(
    appointmentId: string,
    status: 'completed' | 'failed'
  ): Promise<Appointment | null>;

  /**
   * Check if appointment exists for insured and schedule
   * Used for idempotency checks
   *
   * @param insuredId - Insured user identifier
   * @param scheduleId - Schedule identifier
   * @returns Promise with existing appointment or null
   */
  findByInsuredAndSchedule(
    insuredId: string,
    scheduleId: number
  ): Promise<Appointment | null>;
}
