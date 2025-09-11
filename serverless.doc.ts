import type { AWS } from "@serverless/typescript";

const serverlessConfiguration: AWS = {
    service: "medical-appointments-api",
    frameworkVersion: "4",

    plugins: [
        "serverless-openapi-documenter",
    ],

    provider: {
        name: "aws",
        runtime: "nodejs22.x",
        region: "us-east-1",
        stage: "dev",
    },

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
                            description: "Retrieves all appointments for a specific insured person",
                            tags: ["appointments"],
                            pathParams: [
                                {
                                    name: "insuredId",
                                    description: "5-digit insured identification code",
                                    schema: {
                                        type: "string",
                                        pattern: "^\\d{5}$",
                                        example: "12345"
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
            description: "Serverless API for managing medical appointments in Peru and Chile",
            servers: [
                {
                    url: "https://api.medical-appointments.com",
                    description: "Production server"
                },
                {
                    url: "https://dev-api.medical-appointments.com",
                    description: "Development server"
                }
            ],
            contact: {
                name: "API Support",
                email: "support@medical-appointments.com"
            },
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT"
            },
            tags: [
                {
                    name: "appointments",
                    description: "Medical appointment operations"
                }
            ],
            models: [
                {
                    name: "CreateAppointmentRequest",
                    description: "Request body for creating a new medical appointment",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["insuredId", "scheduleId", "countryISO"],
                                properties: {
                                    insuredId: {
                                        type: "string",
                                        pattern: "^\\d{5}$",
                                        description: "5-digit insured identification code",
                                        example: "12345"
                                    },
                                    scheduleId: {
                                        type: "integer",
                                        minimum: 1,
                                        description: "Unique identifier for the appointment slot",
                                        example: 100
                                    },
                                    countryISO: {
                                        type: "string",
                                        enum: ["PE", "CL"],
                                        description: "Country code (PE for Peru, CL for Chile)",
                                        example: "PE"
                                    }
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
                                        description: "Unique appointment identifier (ULID format)",
                                        example: "01ARZ3NDEKTSV4RRFFQ69G5FAV"
                                    },
                                    status: {
                                        type: "string",
                                        enum: ["pending"],
                                        description: "Current status of the appointment",
                                        example: "pending"
                                    },
                                    message: {
                                        type: "string",
                                        description: "Confirmation message",
                                        example: "Appointment created successfully and is being processed"
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    name: "AppointmentListResponse",
                    description: "List of appointments for an insured user",
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        appointmentId: {
                                            type: "string",
                                            description: "Unique appointment identifier",
                                            example: "01ARZ3NDEKTSV4RRFFQ69G5FAV"
                                        },
                                        insuredId: {
                                            type: "string",
                                            description: "5-digit insured identification code",
                                            example: "12345"
                                        },
                                        scheduleId: {
                                            type: "integer",
                                            description: "Appointment slot identifier",
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
                                            enum: ["pending", "completed", "failed"],
                                            description: "Current appointment status",
                                            example: "completed"
                                        },
                                        createdAt: {
                                            type: "string",
                                            format: "date-time",
                                            description: "Appointment creation timestamp",
                                            example: "2024-09-11T10:30:00.000Z"
                                        },
                                        updatedAt: {
                                            type: "string",
                                            format: "date-time",
                                            description: "Last update timestamp",
                                            example: "2024-09-11T10:32:15.000Z"
                                        }
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
                                properties: {
                                    error: {
                                        type: "string",
                                        description: "Error type",
                                        example: "ValidationError"
                                    },
                                    message: {
                                        type: "string",
                                        description: "Human-readable error message",
                                        example: "Invalid input data"
                                    },
                                    timestamp: {
                                        type: "string",
                                        format: "date-time",
                                        description: "Error occurrence timestamp",
                                        example: "2024-09-11T10:30:00.000Z"
                                    }
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
                                properties: {
                                    error: {
                                        type: "string",
                                        example: "NotFound"
                                    },
                                    message: {
                                        type: "string",
                                        example: "No appointments found for the specified insured ID"
                                    },
                                    timestamp: {
                                        type: "string",
                                        format: "date-time"
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        }
    },
};

export default serverlessConfiguration;
