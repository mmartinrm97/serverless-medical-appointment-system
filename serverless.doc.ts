import type { AWS } from "@serverless/typescript";

export const serverlessConfigurationDocs: AWS = {
    functions: {
        // Main appointment Lambda - handles API endpoints
        appointment: {
            handler: "src/modules/appointments/interfaces/http/postAppointment.handler",
            events: [
                {
                    http: {
                        method: "post",
                        path: "/appointments",
                        cors: true,
                        // @ts-ignore - OpenAPI documentation plugin extends this type
                        documentation: {
                            summary: "Create a new medical appointment",
                            description: "Creates a new appointment for a patient in the specified country (PE or CL)",
                            tags: ["appointments"],
                            requestBody: {
                                description: "Appointment creation data",
                                required: true
                            },
                            requestModels: {
                                "application/json": "CreateAppointmentRequest"
                            },
                            methodResponses: [
                                {
                                    statusCode: 201,
                                    responseBody: {
                                        description: "Appointment created successfully"
                                    },
                                    responseModels: {
                                        "application/json": "CreateAppointmentResponse"
                                    }
                                },
                                {
                                    statusCode: 400,
                                    responseBody: {
                                        description: "Invalid input data"
                                    },
                                    responseModels: {
                                        "application/json": "ErrorResponse"
                                    }
                                },
                                {
                                    statusCode: 500,
                                    responseBody: {
                                        description: "Internal server error"
                                    },
                                    responseModels: {
                                        "application/json": "ErrorResponse"
                                    }
                                }
                            ]
                        }
                    },
                },
            ],
        },

        // Get appointments endpoint
        getAppointments: {
            handler: "src/modules/appointments/interfaces/http/getAppointments.handler",
            events: [
                {
                    http: {
                        method: "get",
                        path: "/appointments/{insuredId}",
                        cors: true,
                        // @ts-ignore - OpenAPI documentation plugin extends this type
                        documentation: {
                            summary: "Get appointments for an insured person",
                            description: "Retrieves all appointments for a specific insured person with optional filtering and pagination",
                            tags: ["appointments"],
                            pathParams: [
                                {
                                    name: "insuredId",
                                    description: "5-digit insured identification code",
                                    required: true,
                                    schema: {
                                        type: "string",
                                        pattern: "^\\d{5}$",
                                        example: "12345"
                                    }
                                }
                            ],
                            queryParams: [
                                {
                                    name: "status",
                                    description: "Filter appointments by status",
                                    required: false,
                                    schema: {
                                        type: "string",
                                        enum: ["pending", "completed"],
                                        example: "pending"
                                    }
                                },
                                {
                                    name: "limit",
                                    description: "Maximum number of appointments to return (default: 50, max: 100)",
                                    required: false,
                                    schema: {
                                        type: "integer",
                                        minimum: 1,
                                        maximum: 100,
                                        example: 25
                                    }
                                },
                                {
                                    name: "lastKey",
                                    description: "Pagination key for next page of results",
                                    required: false,
                                    schema: {
                                        type: "string",
                                        example: "01J7N456DEFGHIJKLMNPQRSTU"
                                    }
                                }
                            ],
                            methodResponses: [
                                {
                                    statusCode: 200,
                                    responseBody: {
                                        description: "Appointments retrieved successfully"
                                    },
                                    responseModels: {
                                        "application/json": "AppointmentListResponse"
                                    }
                                },
                                {
                                    statusCode: 404,
                                    responseBody: {
                                        description: "No appointments found for the insured person"
                                    },
                                    responseModels: {
                                        "application/json": "NotFoundResponse"
                                    }
                                },
                                {
                                    statusCode: 400,
                                    responseBody: {
                                        description: "Invalid query parameters"
                                    },
                                    responseModels: {
                                        "application/json": "ErrorResponse"
                                    }
                                },
                                {
                                    statusCode: 500,
                                    responseBody: {
                                        description: "Internal server error"
                                    },
                                    responseModels: {
                                        "application/json": "ErrorResponse"
                                    }
                                }
                            ]
                        },
                        request: {
                            parameters: {
                                paths: {
                                    insuredId: true,
                                },
                                querystrings: {
                                    status: false,
                                    limit: false,
                                    lastKey: false,
                                },
                            },
                        },
                    },
                },
            ],
        },
    },

    custom: {
        documentation: {
            version: "1.0.0",
            title: "Medical Appointments API",
            description: "Serverless API for managing medical appointments in Peru and Chile. This API provides endpoints for creating appointments and retrieving appointment history for insured users.",
            servers: [
                {
                    url: "https://api.medical-appointments.com",
                    description: "Production server"
                },
                {
                    url: "https://dev-api.medical-appointments.com",
                    description: "Development server"
                },
                {
                    url: "http://localhost:3000/dev",
                    description: "Local development server"
                }
            ],
            contact: {
                name: "API Support",
                email: "support@medical-appointments.com",
                url: "https://medical-appointments.com/support"
            },
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT"
            },
            externalDocumentation: {
                description: "Find more info about the Medical Appointments system",
                url: "https://docs.medical-appointments.com"
            },
            tags: [
                {
                    name: "appointments",
                    description: "Appointment management operations",
                    externalDocumentation: {
                        description: "Learn more about appointment workflow",
                        url: "https://docs.medical-appointments.com/appointments"
                    }
                }
            ],
            models: [
                {
                    name: "CreateAppointmentRequest",
                    description: "Request payload for creating a new appointment",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["insuredId", "scheduleId", "countryISO"],
                                properties: {
                                    insuredId: {
                                        type: "string",
                                        pattern: "^\\d{5}$",
                                        description: "5-digit insured identification code (e.g., '01234')",
                                        example: "12345"
                                    },
                                    scheduleId: {
                                        type: "integer",
                                        minimum: 1,
                                        description: "ID of the appointment slot",
                                        example: 100
                                    },
                                    countryISO: {
                                        type: "string",
                                        enum: ["PE", "CL"],
                                        description: "Country code - only PE (Peru) or CL (Chile) allowed",
                                        example: "PE"
                                    }
                                },
                                example: {
                                    insuredId: "12345",
                                    scheduleId: 100,
                                    countryISO: "PE"
                                }
                            }
                        }
                    }
                },
                {
                    name: "CreateAppointmentResponse",
                    description: "Response after successfully creating an appointment",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    appointmentId: {
                                        type: "string",
                                        description: "ULID generated for the new appointment",
                                        example: "01J7N123ABCDEFGHIJKLMNPQRS"
                                    },
                                    insuredId: {
                                        type: "string",
                                        pattern: "^\\d{5}$",
                                        description: "5-digit insured identification code",
                                        example: "12345"
                                    },
                                    scheduleId: {
                                        type: "integer",
                                        description: "Schedule slot ID",
                                        example: 100
                                    },
                                    countryISO: {
                                        type: "string",
                                        enum: ["PE", "CL"],
                                        description: "Country code",
                                        example: "PE"
                                    },
                                    status: {
                                        type: "string",
                                        enum: ["pending"],
                                        description: "Initial status of the appointment",
                                        example: "pending"
                                    },
                                    createdAt: {
                                        type: "string",
                                        format: "date-time",
                                        description: "ISO timestamp when created",
                                        example: "2024-09-11T10:30:00.000Z"
                                    },
                                    updatedAt: {
                                        type: "string",
                                        format: "date-time",
                                        description: "ISO timestamp when last updated",
                                        example: "2024-09-11T10:30:00.000Z"
                                    },
                                    centerId: {
                                        type: "integer",
                                        nullable: true,
                                        description: "Medical center ID (optional)",
                                        example: 4
                                    },
                                    specialtyId: {
                                        type: "integer",
                                        nullable: true,
                                        description: "Medical specialty ID (optional)",
                                        example: 3
                                    },
                                    medicId: {
                                        type: "integer",
                                        nullable: true,
                                        description: "Doctor ID (optional)",
                                        example: 4
                                    },
                                    slotDatetime: {
                                        type: "string",
                                        format: "date-time",
                                        nullable: true,
                                        description: "Appointment slot datetime (optional)",
                                        example: "2024-09-30T12:30:00.000Z"
                                    }
                                },
                                example: {
                                    appointmentId: "01J7N123ABCDEFGHIJKLMNPQRS",
                                    insuredId: "12345",
                                    scheduleId: 100,
                                    countryISO: "PE",
                                    status: "pending",
                                    createdAt: "2024-09-11T10:30:00.000Z",
                                    updatedAt: "2024-09-11T10:30:00.000Z",
                                    centerId: 4,
                                    specialtyId: 3,
                                    medicId: 4,
                                    slotDatetime: "2024-09-30T12:30:00.000Z"
                                }
                            }
                        }
                    }
                },
                {
                    name: "AppointmentListResponse",
                    description: "Response containing a list of appointments with pagination",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["appointments", "pagination"],
                                properties: {
                                    appointments: {
                                        type: "array",
                                        description: "Array of appointment objects",
                                        items: {
                                            type: "object",
                                            required: ["appointmentId", "scheduleId", "countryISO", "status", "createdAt", "updatedAt"],
                                            properties: {
                                                appointmentId: {
                                                    type: "string",
                                                    description: "ULID of the appointment",
                                                    example: "01J7N123ABCDEFGHIJKLMNPQRS"
                                                },
                                                scheduleId: {
                                                    type: "integer",
                                                    description: "Schedule slot ID",
                                                    example: 100
                                                },
                                                countryISO: {
                                                    type: "string",
                                                    enum: ["PE", "CL"],
                                                    description: "Country code",
                                                    example: "PE"
                                                },
                                                status: {
                                                    type: "string",
                                                    enum: ["pending", "completed"],
                                                    description: "Appointment status",
                                                    example: "pending"
                                                },
                                                createdAt: {
                                                    type: "string",
                                                    format: "date-time",
                                                    description: "ISO timestamp when created",
                                                    example: "2024-09-11T10:30:00.000Z"
                                                },
                                                updatedAt: {
                                                    type: "string",
                                                    format: "date-time",
                                                    description: "ISO timestamp when last updated",
                                                    example: "2024-09-11T10:30:00.000Z"
                                                },
                                                centerId: {
                                                    type: "integer",
                                                    nullable: true,
                                                    description: "Medical center ID",
                                                    example: 4
                                                },
                                                specialtyId: {
                                                    type: "integer",
                                                    nullable: true,
                                                    description: "Medical specialty ID",
                                                    example: 3
                                                },
                                                medicId: {
                                                    type: "integer",
                                                    nullable: true,
                                                    description: "Doctor ID",
                                                    example: 4
                                                }
                                            }
                                        }
                                    },
                                    pagination: {
                                        type: "object",
                                        required: ["total", "limit", "hasMore"],
                                        description: "Pagination information",
                                        properties: {
                                            total: {
                                                type: "integer",
                                                minimum: 0,
                                                description: "Total number of appointments",
                                                example: 2
                                            },
                                            limit: {
                                                type: "integer",
                                                minimum: 1,
                                                maximum: 100,
                                                description: "Items per page limit",
                                                example: 50
                                            },
                                            hasMore: {
                                                type: "boolean",
                                                description: "Whether there are more results",
                                                example: false
                                            },
                                            lastKey: {
                                                type: "string",
                                                nullable: true,
                                                description: "Key for next page",
                                                example: "01J7N456DEFGHIJKLMNPQRSTU"
                                            }
                                        }
                                    }
                                },
                                example: {
                                    appointments: [
                                        {
                                            appointmentId: "01J7N123ABCDEFGHIJKLMNPQRS",
                                            scheduleId: 100,
                                            countryISO: "PE",
                                            status: "pending",
                                            createdAt: "2024-09-11T10:30:00.000Z",
                                            updatedAt: "2024-09-11T10:30:00.000Z",
                                            centerId: 4,
                                            specialtyId: 3,
                                            medicId: 4
                                        },
                                        {
                                            appointmentId: "01J7N456DEFGHIJKLMNPQRSTU",
                                            scheduleId: 250,
                                            countryISO: "PE",
                                            status: "completed",
                                            createdAt: "2024-09-10T14:00:00.000Z",
                                            updatedAt: "2024-09-10T16:30:00.000Z",
                                            centerId: 4,
                                            specialtyId: 2,
                                            medicId: 7
                                        }
                                    ],
                                    pagination: {
                                        total: 2,
                                        limit: 50,
                                        hasMore: false,
                                        lastKey: null
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    name: "ErrorResponse",
                    description: "Standard error response format",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["error", "message", "timestamp"],
                                properties: {
                                    error: {
                                        type: "string",
                                        description: "Error type",
                                        example: "ValidationError"
                                    },
                                    message: {
                                        type: "string",
                                        description: "Human-readable error message",
                                        example: "Invalid input data: insuredId must be exactly 5 digits"
                                    },
                                    timestamp: {
                                        type: "string",
                                        format: "date-time",
                                        description: "Error occurrence timestamp",
                                        example: "2024-09-11T10:30:00.000Z"
                                    },
                                    details: {
                                        type: "array",
                                        description: "Detailed validation errors (optional)",
                                        items: {
                                            type: "object",
                                            properties: {
                                                field: {
                                                    type: "string",
                                                    description: "Field name with error"
                                                },
                                                message: {
                                                    type: "string",
                                                    description: "Field-specific error message"
                                                }
                                            }
                                        }
                                    }
                                },
                                example: {
                                    error: "ValidationError",
                                    message: "Invalid input data: insuredId must be exactly 5 digits",
                                    timestamp: "2024-09-11T10:30:00.000Z"
                                }
                            }
                        }
                    }
                },
                {
                    name: "NotFoundResponse",
                    description: "Resource not found error",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["error", "message", "timestamp"],
                                properties: {
                                    error: {
                                        type: "string",
                                        enum: ["NotFound"],
                                        example: "NotFound"
                                    },
                                    message: {
                                        type: "string",
                                        example: "No appointments found for insured ID: 12345"
                                    },
                                    timestamp: {
                                        type: "string",
                                        format: "date-time",
                                        example: "2024-09-11T10:30:00.000Z"
                                    }
                                },
                                example: {
                                    error: "NotFound",
                                    message: "No appointments found for insured ID: 12345",
                                    timestamp: "2024-09-11T10:30:00.000Z"
                                }
                            }
                        }
                    }
                }
            ]
        }
    },
};

