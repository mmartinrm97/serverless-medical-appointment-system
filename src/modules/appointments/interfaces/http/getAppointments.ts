import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import { ListAppointmentsByInsured } from '../../application/use-cases/ListAppointmentsByInsured.js';
import { DynamoDBAppointmentsRepository } from '../../infrastructure/db/dynamodb/DynamoDBAppointmentsRepository.js';
import {
    validateGetAppointmentsPath,
    validateGetAppointmentsQuery,
    GetAppointmentsResponse
} from './schemas/GetAppointmentsSchema.js';
import { createFunctionLogger, logError } from '../../../../shared/infrastructure/logging/logger.js';
import { AppError } from '../../../../shared/domain/errors/AppError.js';

// Initialize logger for this handler
const logger = createFunctionLogger('getAppointments');

/**
 * Lambda handler for GET /appointments/{insuredId} endpoint
 * 
 * Retrieves all appointments for a specific insured user with optional filtering
 * and pagination. Supports filtering by status and pagination via limit/lastKey.
 * 
 * @param event - API Gateway event containing path and query parameters
 * @returns API Gateway response with appointments list or error
 */
export const handler: APIGatewayProxyHandler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const requestId = event.requestContext.requestId;

    logger.info('GET /appointments/{insuredId} request received');

    try {
        // Validate path parameters
        const pathParams = validateGetAppointmentsPath(event.pathParameters);

        // Validate query parameters
        const queryParams = validateGetAppointmentsQuery(event.queryStringParameters);

        logger.info('Request parameters validated successfully');

        // Initialize dependencies
        const appointmentsRepository = new DynamoDBAppointmentsRepository();

        // Initialize use case
        const listAppointmentsUseCase = new ListAppointmentsByInsured(appointmentsRepository);

        // Execute use case - using the simple execute method
        const result = await listAppointmentsUseCase.execute(pathParams.insuredId);

        logger.info('Appointments retrieved successfully');

        // Apply client-side filtering if status filter is provided
        let filteredAppointments = result.appointments;
        if (queryParams.status) {
            filteredAppointments = result.appointments.filter(
                appointment => appointment.status === queryParams.status
            );
        }

        // Apply client-side pagination if needed
        const limit = queryParams.limit ?? 50;
        const paginatedAppointments = filteredAppointments.slice(0, limit);
        const hasMore = filteredAppointments.length > limit;

        // Format response
        const response: GetAppointmentsResponse = {
            appointments: paginatedAppointments.map(appointment => ({
                appointmentId: appointment.appointmentId,
                scheduleId: appointment.scheduleId,
                countryISO: appointment.countryISO as 'PE' | 'CL',
                status: appointment.status as 'pending' | 'completed',
                createdAt: appointment.createdAt,
                updatedAt: appointment.updatedAt,
                centerId: appointment.centerId,
                specialtyId: appointment.specialtyId,
                medicId: appointment.medicId,
            })),
            pagination: {
                total: filteredAppointments.length,
                limit: limit,
                hasMore: hasMore,
                lastKey: hasMore ? `${limit}` : undefined,
            },
        };

        // Success response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            },
            body: JSON.stringify(response),
        };

    } catch (error) {
        logError(error, { requestId, handler: 'getAppointments' });

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
                    message: 'Invalid request parameters',
                    details: error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    })),
                }),
            };
        }

        // Handle application errors
        if (error instanceof AppError) {
            // Handle "not found" cases specifically
            if (error.message.includes('not found') || error.message.includes('No appointments')) {
                return {
                    statusCode: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        error: 'NotFound',
                        message: `No appointments found for insured ID: ${event.pathParameters?.insuredId}`,
                    }),
                };
            }

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
