import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { ZodError } from 'zod';

import { CreateAppointment } from '../../application/use-cases/CreateAppointment.js';
import { DynamoDBAppointmentsRepository } from '../../infrastructure/db/dynamodb/DynamoDBAppointmentsRepository.js';
import { SNSMessagePublisher } from '../../infrastructure/messaging/SNSMessagePublisher.js';
import { validateCreateAppointmentRequest } from '../../application/dtos/CreateAppointmentDto.js';
import {
  createFunctionLogger,
  logError,
} from '../../../../shared/infrastructure/logging/logger.js';
import { AppError } from '../../../../shared/domain/errors/AppError.js';

// Initialize logger for this handler
const logger = createFunctionLogger('postAppointment');

/**
 * Lambda handler for POST /appointments endpoint
 *
 * Creates a new appointment and initiates the processing workflow.
 * The appointment is saved to DynamoDB with "pending" status and
 * a message is published to SNS for country-specific processing.
 *
 * @param event - API Gateway event containing the request
 * @returns API Gateway response with created appointment or error
 */
export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  logger.info('POST /appointments request received');

  try {
    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {};
    const validatedRequest = validateCreateAppointmentRequest(body);

    logger.info('Request validated successfully');

    // Debug environment variables
    logger.debug(`Environment - SNS_TOPIC_ARN: ${process.env.SNS_TOPIC_ARN}`);
    logger.debug(`Environment - AWS_REGION: ${process.env.AWS_REGION}`);

    // Initialize dependencies
    const appointmentsRepository = new DynamoDBAppointmentsRepository({
      region: process.env.AWS_REGION ?? 'us-east-1',
      tableName: process.env.APPOINTMENTS_TABLE ?? 'appointments',
    });
    const messagePublisher = new SNSMessagePublisher({
      topicArn: process.env.SNS_TOPIC_ARN ?? '',
      region: process.env.AWS_REGION ?? 'us-east-1',
    });

    // Initialize use case
    const createAppointmentUseCase = new CreateAppointment(
      appointmentsRepository,
      messagePublisher
    );

    // Execute use case
    const result = await createAppointmentUseCase.execute(validatedRequest);

    logger.info('Appointment created successfully');

    // Success response using the DTO response format
    const response = result;

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    logError(error, { requestId, handler: 'postAppointment' });

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'Invalid request data',
          details: error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      };
    }

    // Handle application errors
    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: error.name,
          message: error.message,
        }),
      };
    }

    // Handle unexpected errors
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      }),
    };
  }
};
