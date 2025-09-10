import type { Appointment } from '../../../domain/entities/Appointment.js';
import type { ICountryStrategy, AppointmentProcessResult } from '../../../domain/services/ICountryStrategy.js';
import { RDSClient, type RDSConfig } from './RDSClient.js';
import { InfrastructureError } from '../../../../../shared/domain/errors/index.js';
import { createLogger } from '../../../../../shared/infrastructure/logging/logger.js';

/**
 * Peru-specific appointment writer for RDS MySQL database.
 * 
 * Implements the country strategy pattern for Peru (PE).
 * Handles appointment persistence to Peru's RDS MySQL database.
 */
export class AppointmentWriterPE implements ICountryStrategy {
    readonly countryCode: 'PE' = 'PE';
    private rdsClient: RDSClient | null = null;
    private readonly logger = createLogger({ component: 'AppointmentWriterPE' });

    /**
     * Creates a new Peru appointment writer.
     * 
     * @param config - RDS configuration for Peru database
     */
    constructor(private readonly config: RDSConfig) {
        this.logger.info('Peru appointment writer initialized');
    }

    /**
     * Processes an appointment for Peru by writing to RDS MySQL.
     * 
     * @param appointment - Appointment to process
     * @returns Processing result with success status
     * @throws {InfrastructureError} When database operation fails
     */
    async processAppointment(appointment: Appointment): Promise<AppointmentProcessResult> {
        this.logger.info(`Processing appointment for Peru: ${appointment.appointmentId}`);

        try {
            // Ensure RDS client is initialized
            if (!this.rdsClient) {
                this.rdsClient = new RDSClient(this.config);
                await this.rdsClient.initialize();
            }

            // Begin transaction for data consistency
            const transaction = await this.rdsClient.beginTransaction();

            try {
                // Insert appointment into Peru's RDS
                const insertQuery = `
          INSERT INTO appointments (
            appointment_id,
            insured_id,
            schedule_id,
            center_id,
            specialty_id,
            medic_id,
            slot_datetime,
            country_iso,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

                const insertParams = [
                    appointment.appointmentId,
                    appointment.insuredId,
                    appointment.scheduleId,
                    appointment.centerId ?? null,
                    appointment.specialtyId ?? null,
                    appointment.medicId ?? null,
                    appointment.slotDatetime?.toISOString() ?? null,
                    appointment.countryISO,
                    'confirmed',
                    appointment.createdAt.toISOString(),
                    new Date().toISOString(),
                ];

                const result = await transaction.execute(insertQuery, insertParams);

                // Get the inserted record ID (MySQL result for INSERT has insertId)
                const insertResult = result as unknown as { insertId: number };
                const rdsRecordId = insertResult.insertId;

                // Commit the transaction
                await transaction.commit();

                this.logger.info(`Appointment successfully written to Peru RDS: ${appointment.appointmentId}, record ID: ${rdsRecordId}`);

                return {
                    success: true,
                    message: 'Appointment successfully processed in Peru',
                    appointmentId: appointment.appointmentId,
                    processedAt: new Date(),
                };

            } catch (error: unknown) {
                // Rollback transaction on error
                await transaction.rollback();
                throw error;
            }

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to process appointment in Peru: ${errorMessage} for appointment ${appointment.appointmentId}`);

            throw new InfrastructureError(
                'Peru appointment processing',
                errorMessage,
                { appointmentId: appointment.appointmentId, countryISO: 'PE' }
            );
        }
    }

    /**
     * Validates Peru-specific business rules.
     * 
     * @param appointment - Appointment to validate
     * @returns True if valid for Peru processing
     */
    async validateAppointment(appointment: Appointment): Promise<boolean> {
        try {
            // Peru-specific validations
            if (appointment.countryISO !== 'PE') {
                this.logger.warn(`Invalid country for Peru writer: ${appointment.countryISO}`);
                return false;
            }

            // Validate insured ID format for Peru (5 digits)
            if (!/^\d{5}$/.test(appointment.insuredId)) {
                this.logger.warn(`Invalid insured ID format for Peru: ${appointment.insuredId}`);
                return false;
            }

            // Validate schedule ID is positive
            if (appointment.scheduleId <= 0) {
                this.logger.warn(`Invalid schedule ID for Peru: ${appointment.scheduleId}`);
                return false;
            }

            this.logger.debug(`Appointment validation passed for Peru: ${appointment.appointmentId}`);
            return true;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Appointment validation failed for Peru: ${errorMessage}`);
            return false;
        }
    }

    /**
     * Gets database configuration for Peru.
     * 
     * @returns Database configuration
     */
    async getDatabaseConfig(): Promise<{
        host: string;
        database: string;
        port: number;
    }> {
        return {
            host: this.config.host,
            database: this.config.database,
            port: this.config.port,
        };
    }

    /**
     * Closes the RDS client connection.
     */
    async close(): Promise<void> {
        if (this.rdsClient) {
            await this.rdsClient.close();
            this.rdsClient = null;
            this.logger.info('Peru appointment writer closed');
        }
    }
}
