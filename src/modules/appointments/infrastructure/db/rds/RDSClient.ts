import mysql from 'mysql2/promise';
import { InfrastructureError } from '../../../../../shared/domain/errors/index.js';
import { createLogger } from '../../../../../shared/infrastructure/logging/logger.js';

/**
 * RDS database configuration interface.
 */
export interface RDSConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionLimit?: number;
    acquireTimeout?: number;
    timeout?: number;
}

/**
 * RDS client for MySQL database operations.
 * 
 * Provides connection management, error handling, and transaction support
 * for country-specific RDS databases.
 */
export class RDSClient {
    private pool: mysql.Pool | null = null;
    private readonly config: RDSConfig;
    private readonly logger = createLogger({ component: 'RDSClient' });

    /**
     * Creates a new RDS client instance.
     * 
     * @param config - Database configuration
     */
    constructor(config: RDSConfig) {
        this.config = {
            ...config,
            connectionLimit: config.connectionLimit ?? 10,
            acquireTimeout: config.acquireTimeout ?? 60000,
            timeout: config.timeout ?? 60000,
        };

        this.logger.info(`RDS client initialized for host: ${this.config.host}`);
    }

    /**
     * Initializes the connection pool.
     * 
     * @throws {InfrastructureError} When pool creation fails
     */
    async initialize(): Promise<void> {
        try {
            if (this.pool) {
                this.logger.warn('RDS pool already initialized');
                return;
            }

            this.pool = mysql.createPool({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                connectionLimit: this.config.connectionLimit,
                // Connection options
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
                dateStrings: true,
                timezone: 'Z',
                // Query options
                multipleStatements: false,
            });

            // Test the connection
            await this.testConnection();

            this.logger.info(`RDS connection pool created successfully for ${this.config.host}`);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initialize RDS pool: ${errorMessage}`);
            throw new InfrastructureError('RDS pool initialization', errorMessage);
        }
    }

    /**
     * Tests the database connection.
     * 
     * @throws {InfrastructureError} When connection test fails
     */
    private async testConnection(): Promise<void> {
        if (!this.pool) {
            throw new InfrastructureError('RDS connection test', 'Pool not initialized');
        }

        try {
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();

            this.logger.info('RDS connection test successful');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`RDS connection test failed: ${errorMessage}`);
            throw new InfrastructureError('RDS connection test', errorMessage);
        }
    }

    /**
     * Executes a query with automatic retry logic.
     * 
     * @param query - SQL query to execute
     * @param params - Query parameters
     * @returns Query results
     * @throws {InfrastructureError} When query execution fails
     */
    async execute<T = mysql.RowDataPacket[]>(
        query: string,
        params?: Record<string, unknown> | unknown[]
    ): Promise<T> {
        if (!this.pool) {
            await this.initialize();
        }

        let retries = 3;
        let lastError: Error | null = null;

        while (retries > 0) {
            try {
                const [rows] = await this.pool!.execute(query, params as unknown[]);

                this.logger.debug(`Query executed successfully: ${query.substring(0, 100)}...`);
                return rows as T;

            } catch (error: unknown) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                retries--;

                if (this.isRetryableError(lastError) && retries > 0) {
                    this.logger.warn(`Retryable error occurred, retries left: ${retries} - ${lastError.message}`);
                    await this.sleep(1000 * (4 - retries)); // Exponential backoff
                    continue;
                }

                break;
            }
        }

        const errorMessage = lastError?.message ?? 'Unknown error';
        this.logger.error(`Query execution failed after retries: ${errorMessage}`);
        throw new InfrastructureError('RDS query execution', errorMessage);
    }

    /**
     * Begins a transaction and returns a transaction client.
     * 
     * @returns Transaction client
     * @throws {InfrastructureError} When transaction creation fails
     */
    async beginTransaction(): Promise<RDSTransaction> {
        if (!this.pool) {
            await this.initialize();
        }

        try {
            const connection = await this.pool!.getConnection();
            await connection.beginTransaction();

            return new RDSTransaction(connection, this.logger);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to begin transaction: ${errorMessage}`);
            throw new InfrastructureError('RDS transaction begin', errorMessage);
        }
    }

    /**
     * Closes the connection pool.
     */
    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.logger.info('RDS connection pool closed');
        }
    }

    /**
     * Checks if an error is retryable.
     * 
     * @param error - Error to check
     * @returns True if error is retryable
     */
    private isRetryableError(error: Error): boolean {
        const retryableErrors = [
            'ECONNRESET',
            'ENOTFOUND',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ER_LOCK_WAIT_TIMEOUT',
            'ER_LOCK_DEADLOCK',
        ];

        return retryableErrors.some(code =>
            error.message.includes(code) || error.name.includes(code)
        );
    }

    /**
     * Sleep utility for retry logic.
     * 
     * @param ms - Milliseconds to sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * RDS transaction wrapper for managing database transactions.
 */
export class RDSTransaction {
    private isCompleted = false;

    constructor(
        private readonly connection: mysql.PoolConnection,
        private readonly logger: ReturnType<typeof createLogger>
    ) { }

    /**
     * Executes a query within the transaction.
     * 
     * @param query - SQL query to execute
     * @param params - Query parameters
     * @returns Query results
     * @throws {InfrastructureError} When query execution fails
     */
    async execute<T = mysql.RowDataPacket[]>(
        query: string,
        params?: Record<string, unknown> | unknown[]
    ): Promise<T> {
        if (this.isCompleted) {
            throw new InfrastructureError('RDS transaction', 'Transaction already completed');
        }

        try {
            const [rows] = await this.connection.execute(query, params as unknown[]);

            this.logger.debug(`Transaction query executed: ${query.substring(0, 100)}...`);
            return rows as T;

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Transaction query failed: ${errorMessage}`);
            throw new InfrastructureError('RDS transaction query', errorMessage);
        }
    }

    /**
     * Commits the transaction.
     * 
     * @throws {InfrastructureError} When commit fails
     */
    async commit(): Promise<void> {
        if (this.isCompleted) {
            throw new InfrastructureError('RDS transaction', 'Transaction already completed');
        }

        try {
            await this.connection.commit();
            this.isCompleted = true;
            this.connection.release();

            this.logger.debug('Transaction committed successfully');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Transaction commit failed: ${errorMessage}`);
            await this.rollback();
            throw new InfrastructureError('RDS transaction commit', errorMessage);
        }
    }

    /**
     * Rolls back the transaction.
     * 
     * @throws {InfrastructureError} When rollback fails
     */
    async rollback(): Promise<void> {
        if (this.isCompleted) {
            return; // Already completed
        }

        try {
            await this.connection.rollback();
            this.isCompleted = true;
            this.connection.release();

            this.logger.debug('Transaction rolled back successfully');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Transaction rollback failed: ${errorMessage}`);
            this.connection.release();
            throw new InfrastructureError('RDS transaction rollback', errorMessage);
        }
    }
}
