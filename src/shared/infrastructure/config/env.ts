/**
 * Environment variables configuration and validation
 * Provides type-safe access to environment variables with defaults
 */

import { z } from 'zod';

/**
 * Environment variables schema with validation rules
 */
const envSchema = z.object({
    // AWS Region
    AWS_REGION: z.string().default('us-east-1'),

    // DynamoDB
    DYNAMODB_TABLE_NAME: z.string().default('appointments'),

    // SNS
    SNS_TOPIC_ARN: z.string().optional(),

    // SQS
    SQS_PE_URL: z.string().optional(),
    SQS_CL_URL: z.string().optional(),
    SQS_COMPLETION_URL: z.string().optional(),

    // EventBridge
    EVENT_BUS_NAME: z.string().default('default'),

    // RDS (via SSM parameters - will be resolved at runtime)
    DB_HOST_PE_PARAM: z.string().default('/appointments/db/pe/host'),
    DB_HOST_CL_PARAM: z.string().default('/appointments/db/cl/host'),
    DB_SECRET_ARN: z.string().optional(),

    // Application
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Serverless Stage
    STAGE: z.string().default('dev'),
});

/**
 * Validated environment variables
 */
export const env = envSchema.parse(process.env);

/**
 * Environment type for type safety
 */
export type Environment = z.infer<typeof envSchema>;

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in test
 */
export const isTest = env.NODE_ENV === 'test';
