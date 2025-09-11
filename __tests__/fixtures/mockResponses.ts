// Mock responses from AWS services for testing

// DynamoDB responses
export const mockDynamoDBGetResponse = {
    Item: {
        PK: '12345',
        SK: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        appointmentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'pending',
        createdAt: '2024-01-10T08:00:00.000Z',
        updatedAt: '2024-01-10T08:00:00.000Z',
        centerId: 1,
        specialtyId: 10,
        medicId: 20,
        slotDatetime: '2024-01-15T10:00:00.000Z'
    }
};

export const mockDynamoDBQueryResponse = {
    Items: [
        {
            PK: '12345',
            SK: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            appointmentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            scheduleId: 100,
            countryISO: 'PE',
            status: 'pending',
            createdAt: '2024-01-10T08:00:00.000Z',
            updatedAt: '2024-01-10T08:00:00.000Z',
            centerId: 1,
            specialtyId: 10
        },
        {
            PK: '12345',
            SK: '01B5TGWJV5KP2N8CGJ6Q7Y8ZW2',
            appointmentId: '01B5TGWJV5KP2N8CGJ6Q7Y8ZW2',
            scheduleId: 101,
            countryISO: 'CL',
            status: 'completed',
            createdAt: '2024-01-10T09:00:00.000Z',
            updatedAt: '2024-01-11T10:00:00.000Z',
            centerId: 2,
            specialtyId: 11
        }
    ],
    Count: 2,
    ScannedCount: 2
};

export const mockDynamoDBPutResponse = {
    $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
    }
};

export const mockDynamoDBUpdateResponse = {
    $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
    },
    Attributes: {
        PK: '12345',
        SK: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        appointmentId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        scheduleId: 100,
        countryISO: 'PE',
        status: 'completed',
        createdAt: '2024-01-10T08:00:00.000Z',
        updatedAt: '2024-01-11T10:00:00.000Z'
    }
};

// SNS responses
export const mockSNSPublishResponse = {
    MessageId: 'test-message-id-12345',
    $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
    }
};

// SQS responses
export const mockSQSSendMessageResponse = {
    MessageId: 'test-sqs-message-id-12345',
    MD5OfBody: 'test-md5-hash',
    $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
    }
};

export const mockSQSReceiveMessageResponse = {
    Messages: [
        {
            MessageId: 'test-message-id',
            ReceiptHandle: 'test-receipt-handle',
            Body: JSON.stringify({
                appointmentId: '01HKNEX123456789ABCDEFGHIJ',
                insuredId: '12345',
                scheduleId: 100,
                countryISO: 'PE'
            }),
            Attributes: {
                SentTimestamp: '1704873600000'
            }
        }
    ]
};

// EventBridge responses
export const mockEventBridgePutEventsResponse = {
    FailedEntryCount: 0,
    Entries: [
        {
            EventId: 'test-event-id-12345'
        }
    ],
    $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
    }
};

// Error responses
export const mockDynamoDBError = {
    name: 'ResourceNotFoundException',
    message: 'Requested resource not found',
    $fault: 'client' as const,
    $metadata: {
        httpStatusCode: 400,
        requestId: 'test-error-request-id'
    }
};

export const mockSNSError = {
    name: 'InvalidParameterException',
    message: 'Invalid parameter: TopicArn',
    $fault: 'client' as const,
    $metadata: {
        httpStatusCode: 400,
        requestId: 'test-error-request-id'
    }
};

export const mockSQSError = {
    name: 'QueueDoesNotExist',
    message: 'The specified queue does not exist',
    $fault: 'client' as const,
    $metadata: {
        httpStatusCode: 400,
        requestId: 'test-error-request-id'
    }
};

// HTTP API Gateway event fixtures
export const mockAPIGatewayEvent = {
    httpMethod: 'POST',
    path: '/appointments',
    pathParameters: null,
    queryStringParameters: null,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        stage: 'test',
        requestId: 'test-request-id',
        identity: {
            sourceIp: '127.0.0.1'
        },
        httpMethod: 'POST',
        resourcePath: '/appointments'
    },
    resource: '/appointments',
    stageVariables: null,
    multiValueQueryStringParameters: null
};

export const mockLambdaContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-aws-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2024/01/10/[$LATEST]test-log-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => { },
    fail: () => { },
    succeed: () => { }
};
