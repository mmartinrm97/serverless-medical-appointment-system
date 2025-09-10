/**
 * Country strategy interface
 * Implements Strategy pattern for country-specific appointment processing
 */

import type { Appointment } from '../entities/Appointment.js';

/**
 * Result of appointment processing
 */
export interface AppointmentProcessResult {
    success: boolean;
    message: string;
    appointmentId: string;
    processedAt: Date;
}

/**
 * Strategy interface for country-specific appointment processing
 */
export interface ICountryStrategy {
    /**
     * Country code this strategy handles  
     */
    readonly countryCode: 'PE' | 'CL';

    /**
     * Process appointment for this country
     * This includes writing to the country's RDS database
     * 
     * @param appointment - Appointment to process
     * @returns Promise with processing result
     */
    processAppointment(_appointment: Appointment): Promise<AppointmentProcessResult>;

    /**
     * Validate country-specific business rules
     * 
     * @param appointment - Appointment to validate
     * @returns Promise with validation result
     */
    validateAppointment(_appointment: Appointment): Promise<boolean>;

    /**
     * Get database connection configuration for this country
     * This is used by the RDS writers
     * 
     * @returns Database configuration
     */
    getDatabaseConfig(): Promise<{
        host: string;
        database: string;
        port: number;
    }>;
}
