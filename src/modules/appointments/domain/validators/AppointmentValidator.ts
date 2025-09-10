/**
 * Appointment domain validations
 * Centralized validation logic for appointment business rules
 */

import type { CountryISO } from '../entities/Appointment.js';
import { ValidationError } from '@/shared/domain/errors/index.js';

/**
 * Appointment creation data for validation
 */
export interface AppointmentValidationData {
    insuredId: string;
    scheduleId: number;
    countryISO: CountryISO;
}

/**
 * Appointment validator with business rule validations
 */
export class AppointmentValidator {
    /**
     * Validate insured ID format (must be exactly 5 digits)
     * 
     * @param insuredId - Insured ID to validate
     * @throws ValidationError if invalid format
     */
    public static validateInsuredId(insuredId: string): void {
        if (!insuredId || typeof insuredId !== 'string') {
            throw new ValidationError(
                'Insured ID is required and must be a string',
                { insuredId }
            );
        }

        if (!/^\d{5}$/.test(insuredId)) {
            throw new ValidationError(
                'Insured ID must be exactly 5 digits',
                { insuredId, format: 'Expected: 5 digits (e.g., "12345")' }
            );
        }
    }

    /**
     * Validate schedule ID (must be a positive number)
     * 
     * @param scheduleId - Schedule ID to validate
     * @throws ValidationError if invalid
     */
    public static validateScheduleId(scheduleId: number): void {
        if (typeof scheduleId !== 'number' || !Number.isInteger(scheduleId)) {
            throw new ValidationError(
                'Schedule ID must be an integer',
                { scheduleId, type: typeof scheduleId }
            );
        }

        if (scheduleId <= 0) {
            throw new ValidationError(
                'Schedule ID must be a positive number',
                { scheduleId }
            );
        }
    }

    /**
     * Validate country ISO code (must be PE or CL)
     * 
     * @param countryISO - Country ISO to validate
     * @throws ValidationError if invalid country
     */
    public static validateCountryISO(countryISO: string): asserts countryISO is CountryISO {
        if (!countryISO || typeof countryISO !== 'string') {
            throw new ValidationError(
                'Country ISO is required and must be a string',
                { countryISO }
            );
        }

        const validCountries: CountryISO[] = ['PE', 'CL'];
        if (!validCountries.includes(countryISO as CountryISO)) {
            throw new ValidationError(
                'Country ISO must be PE or CL',
                { countryISO, validCountries }
            );
        }
    }

    /**
     * Comprehensive validation for appointment creation data
     * 
     * @param data - Appointment data to validate
     * @throws ValidationError if any validation fails
     * 
     * @example
     * ```typescript
     * try {
     *   AppointmentValidator.validateAppointmentData({
     *     insuredId: "12345",
     *     scheduleId: 100,
     *     countryISO: "PE"
     *   });
     * } catch (error) {
     *   // Handle validation error
     * }
     * ```
     */
    public static validateAppointmentData(data: AppointmentValidationData): void {
        this.validateInsuredId(data.insuredId);
        this.validateScheduleId(data.scheduleId);
        this.validateCountryISO(data.countryISO);
    }

    /**
     * Sanitize insured ID (trim whitespace, pad with leading zeros if needed)
     * 
     * @param insuredId - Raw insured ID
     * @returns Sanitized 5-digit insured ID
     * @throws ValidationError if cannot be sanitized
     * 
     * @example
     * ```typescript
     * const sanitized = AppointmentValidator.sanitizeInsuredId("123"); // "00123"
     * const sanitized2 = AppointmentValidator.sanitizeInsuredId(" 12345 "); // "12345"
     * ```
     */
    public static sanitizeInsuredId(insuredId: string): string {
        if (!insuredId || typeof insuredId !== 'string') {
            throw new ValidationError('Insured ID is required');
        }

        // Remove whitespace
        const trimmed = insuredId.trim();

        // Check if it's numeric
        if (!/^\d+$/.test(trimmed)) {
            throw new ValidationError(
                'Insured ID must contain only digits',
                { insuredId, trimmed }
            );
        }

        // Check length (max 5 digits)
        if (trimmed.length > 5) {
            throw new ValidationError(
                'Insured ID cannot be longer than 5 digits',
                { insuredId, length: trimmed.length }
            );
        }

        // Pad with leading zeros to make it exactly 5 digits
        return trimmed.padStart(5, '0');
    }

    /**
     * Check if country supports specific features
     * This can be extended for country-specific business rules
     * 
     * @param countryISO - Country to check
     * @param feature - Feature to check support for
     * @returns True if feature is supported
     */
    public static countrySupportsFeature(
        countryISO: CountryISO,
        feature: 'emergency_appointments' | 'weekend_appointments' | 'telemedicine'
    ): boolean {
        const countryFeatures: Record<CountryISO, string[]> = {
            PE: ['emergency_appointments', 'weekend_appointments', 'telemedicine'],
            CL: ['emergency_appointments', 'telemedicine'], // No weekend appointments in Chile
        };

        return countryFeatures[countryISO]?.includes(feature) ?? false;
    }
}
