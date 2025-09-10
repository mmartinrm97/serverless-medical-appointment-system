/**
 * AWS services configuration
 * Centralized configuration for AWS clients and services
 */

import { env } from './env.js';

/**
 * AWS client configuration options
 */
export interface AWSClientConfig {
    region: string;
    maxAttempts?: number;
    requestTimeout?: number;
}

/**
 * DynamoDB configuration
 */
export interface DynamoDBConfig extends AWSClientConfig {
    tableName: string;
    consistentRead?: boolean;
    maxRetries?: number;
}

/**
 * SNS configuration
 */
export interface SNSConfig extends AWSClientConfig {
    topicArn?: string;
    messageAttributes?: Record<string, string>;
}

/**
 * SQS configuration
 */
export interface SQSConfig extends AWSClientConfig {
    queueUrls: {
        pe: string;
        cl: string;
        completion: string;
    };
    messageRetentionPeriod?: number;
    visibilityTimeout?: number;
}

/**
 * EventBridge configuration
 */
export interface EventBridgeConfig extends AWSClientConfig {
    eventBusName: string;
    source: string;
}

/**
 * RDS configuration for both countries
 */
export interface RDSConfigs {
    pe: {
        hostParameter: string;
        database: string;
        port: number;
        secretArn?: string;
    };
    cl: {
        hostParameter: string;
        database: string;
        port: number;
        secretArn?: string;
    };
}

/**
 * Default AWS client configuration
 */
export const defaultAWSConfig: AWSClientConfig = {
    region: env.AWS_REGION,
    maxAttempts: 3,
    requestTimeout: 30000, // 30 seconds
};

/**
 * DynamoDB configuration with defaults
 */
export const dynamoDBConfig: DynamoDBConfig = {
    ...defaultAWSConfig,
    tableName: env.DYNAMODB_TABLE_NAME,
    consistentRead: false,
    maxRetries: 3,
};

/**
 * SNS configuration with defaults
 */
export const snsConfig: SNSConfig = {
    ...defaultAWSConfig,
    topicArn: env.SNS_TOPIC_ARN,
    messageAttributes: {
        source: 'appointments.api',
    },
};

/**
 * SQS configuration with defaults
 */
export const sqsConfig: SQSConfig = {
    ...defaultAWSConfig,
    queueUrls: {
        pe: env.SQS_PE_URL ?? '',
        cl: env.SQS_CL_URL ?? '',
        completion: env.SQS_COMPLETION_URL ?? '',
    },
    messageRetentionPeriod: 1209600, // 14 days in seconds
    visibilityTimeout: 300, // 5 minutes
};

/**
 * EventBridge configuration with defaults
 */
export const eventBridgeConfig: EventBridgeConfig = {
    ...defaultAWSConfig,
    eventBusName: env.EVENT_BUS_NAME,
    source: 'rimac.appointments',
};

/**
 * RDS configurations for both countries
 */
export const rdsConfigs: RDSConfigs = {
    pe: {
        hostParameter: env.DB_HOST_PE_PARAM,
        database: 'appointments_pe',
        port: 3306,
        secretArn: env.DB_SECRET_ARN,
    },
    cl: {
        hostParameter: env.DB_HOST_CL_PARAM,
        database: 'appointments_cl',
        port: 3306,
        secretArn: env.DB_SECRET_ARN,
    },
};

/**
 * Connection pooling settings for RDS
 */
export const rdsPoolConfig = {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    idleTimeout: 300000, // 5 minutes
};

/**
 * Get AWS configuration based on environment
 */
export const getAWSConfig = (_service: 'dynamodb' | 'sns' | 'sqs' | 'eventbridge'): AWSClientConfig => {
    const baseConfig = { ...defaultAWSConfig };

    // Adjust configuration based on environment
    if (env.NODE_ENV === 'production') {
        baseConfig.maxAttempts = 5;
        baseConfig.requestTimeout = 60000; // 60 seconds for production
    } else if (env.NODE_ENV === 'development') {
        baseConfig.maxAttempts = 2;
        baseConfig.requestTimeout = 15000; // 15 seconds for development
    }

    return baseConfig;
};

/**
 * Validate that required environment variables are set
 */
export const validateAWSConfig = (): boolean => {
    const required = [];

    if (!env.SNS_TOPIC_ARN) {
        required.push('SNS_TOPIC_ARN');
    }

    if (!env.SQS_PE_URL) {
        required.push('SQS_PE_URL');
    }

    if (!env.SQS_CL_URL) {
        required.push('SQS_CL_URL');
    }

    if (!env.SQS_COMPLETION_URL) {
        required.push('SQS_COMPLETION_URL');
    }

    if (required.length > 0) {
        console.warn(`Missing required AWS configuration: ${required.join(', ')}`);
        return false;
    }

    return true;
};

/**
 * Get service endpoint for local development
 */
export const getLocalEndpoint = (service: string): string | undefined => {
    if (env.NODE_ENV === 'development') {
        const endpoints: Record<string, string> = {
            dynamodb: 'http://localhost:8000',
            sns: 'http://localhost:4566',
            sqs: 'http://localhost:4566',
            eventbridge: 'http://localhost:4566',
        };

        return endpoints[service];
    }

    return undefined;
};
