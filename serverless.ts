import type { AWS } from "@serverless/typescript";

const serverlessConfiguration: AWS = {
    service: "medical-appointments-api",
    frameworkVersion: "4",
    plugins: [
        "serverless-esbuild",
        "serverless-offline",
    ],
    provider: {
        name: "aws",
        runtime: "nodejs22.x",
        region: "us-east-1",
        stage: "${opt:stage, 'dev'}",
        apiGateway: {
            minimumCompressionSize: 1024,
            shouldStartNameWithService: true,
        },
        environment: {
            AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
            NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
            // DynamoDB
            APPOINTMENTS_TABLE: "${self:service}-appointments-${self:provider.stage}",
            // SNS
            SNS_TOPIC_ARN: { Ref: "AppointmentNotificationsTopic" },
            // SQS
            SQS_PE_URL: { Ref: "AppointmentPeQueue" },
            SQS_CL_URL: { Ref: "AppointmentClQueue" },
            SQS_COMPLETION_URL: { Ref: "AppointmentCompletionQueue" },
            // EventBridge
            EVENT_BUS_NAME: "default",
            // RDS (these would be provided via SSM/Secrets Manager in real scenario)
            DB_HOST_PE: "${ssm:/medical-appointments/${self:provider.stage}/db/host/pe}",
            DB_HOST_CL: "${ssm:/medical-appointments/${self:provider.stage}/db/host/cl}",
            DB_SECRET_ARN: "${ssm:/medical-appointments/${self:provider.stage}/db/secret/arn}",
        },
        iam: {
            role: {
                statements: [
                    // DynamoDB permissions
                    {
                        Effect: "Allow",
                        Action: [
                            "dynamodb:Query",
                            "dynamodb:Scan",
                            "dynamodb:GetItem",
                            "dynamodb:PutItem",
                            "dynamodb:UpdateItem",
                            "dynamodb:DeleteItem",
                        ],
                        Resource: [
                            "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${self:service}-appointments-${self:provider.stage}",
                            "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${self:service}-appointments-${self:provider.stage}/index/*",
                        ],
                    },
                    // SNS permissions
                    {
                        Effect: "Allow",
                        Action: [
                            "sns:Publish",
                        ],
                        Resource: [
                            { Ref: "AppointmentNotificationsTopic" },
                        ],
                    },
                    // SQS permissions
                    {
                        Effect: "Allow",
                        Action: [
                            "sqs:SendMessage",
                            "sqs:ReceiveMessage",
                            "sqs:DeleteMessage",
                            "sqs:GetQueueAttributes",
                        ],
                        Resource: [
                            { "Fn::GetAtt": ["AppointmentPeQueue", "Arn"] },
                            { "Fn::GetAtt": ["AppointmentClQueue", "Arn"] },
                            { "Fn::GetAtt": ["AppointmentCompletionQueue", "Arn"] },
                        ],
                    },
                    // EventBridge permissions
                    {
                        Effect: "Allow",
                        Action: [
                            "events:PutEvents",
                        ],
                        Resource: [
                            "arn:aws:events:${aws:region}:${aws:accountId}:event-bus/default",
                        ],
                    },
                    // Secrets Manager permissions (for RDS credentials)
                    {
                        Effect: "Allow",
                        Action: [
                            "secretsmanager:GetSecretValue",
                        ],
                        Resource: [
                            "arn:aws:secretsmanager:${aws:region}:${aws:accountId}:secret:medical-appointments/*",
                        ],
                    },
                    // SSM permissions (for configuration)
                    {
                        Effect: "Allow",
                        Action: [
                            "ssm:GetParameter",
                            "ssm:GetParameters",
                        ],
                        Resource: [
                            "arn:aws:ssm:${aws:region}:${aws:accountId}:parameter/medical-appointments/*",
                        ],
                    },
                ],
            },
        },
    },
    functions: {
        // Main appointment Lambda - handles API endpoints and completion
        appointment: {
            handler: "src/modules/appointments/interfaces/http/postAppointment.handler",
            timeout: 30,
            memorySize: 256,
            events: [
                {
                    http: {
                        method: "post",
                        path: "/appointments",
                        cors: true,
                    },
                },
            ],
        },
        getAppointments: {
            handler: "src/modules/appointments/interfaces/http/getAppointments.handler",
            timeout: 30,
            memorySize: 256,
            events: [
                {
                    http: {
                        method: "get",
                        path: "/appointments/{insuredId}",
                        cors: true,
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
        // Completion handler for updating appointment status
        appointmentCompletion: {
            handler: "src/modules/appointments/interfaces/queues/completionHandler.handler",
            timeout: 60,
            memorySize: 256,
            events: [
                {
                    sqs: {
                        arn: { "Fn::GetAtt": ["AppointmentCompletionQueue", "Arn"] },
                        batchSize: 10,
                        maximumBatchingWindow: 5,
                    },
                },
            ],
        },
        // Peru country Lambda - processes PE appointments
        appointmentPe: {
            handler: "src/modules/appointments/interfaces/queues/appointmentPeHandler.handler",
            timeout: 60,
            memorySize: 512,
            events: [
                {
                    sqs: {
                        arn: { "Fn::GetAtt": ["AppointmentPeQueue", "Arn"] },
                        batchSize: 10,
                        maximumBatchingWindow: 5,
                    },
                },
            ],
        },
        // Chile country Lambda - processes CL appointments
        appointmentCl: {
            handler: "src/modules/appointments/interfaces/queues/appointmentClHandler.handler",
            timeout: 60,
            memorySize: 512,
            events: [
                {
                    sqs: {
                        arn: { "Fn::GetAtt": ["AppointmentClQueue", "Arn"] },
                        batchSize: 10,
                        maximumBatchingWindow: 5,
                    },
                },
            ],
        },
    },
    resources: {
        Resources: {
            // DynamoDB Table for Appointments
            AppointmentsTable: {
                Type: "AWS::DynamoDB::Table",
                Properties: {
                    TableName: "${self:service}-appointments-${self:provider.stage}",
                    AttributeDefinitions: [
                        {
                            AttributeName: "PK", // insuredId
                            AttributeType: "S",
                        },
                        {
                            AttributeName: "SK", // appointmentId (ULID)
                            AttributeType: "S",
                        },
                    ],
                    KeySchema: [
                        {
                            AttributeName: "PK",
                            KeyType: "HASH",
                        },
                        {
                            AttributeName: "SK",
                            KeyType: "RANGE",
                        },
                    ],
                    BillingMode: "PAY_PER_REQUEST",
                    StreamSpecification: {
                        StreamViewType: "NEW_AND_OLD_IMAGES",
                    },
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                    ],
                },
            },

            // SNS Topic for appointment notifications
            AppointmentNotificationsTopic: {
                Type: "AWS::SNS::Topic",
                Properties: {
                    TopicName: "${self:service}-appointment-notifications-${self:provider.stage}",
                    DisplayName: "Medical Appointments Notifications",
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                    ],
                },
            },

            // SQS Queue for Peru appointments
            AppointmentPeQueue: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-pe-${self:provider.stage}",
                    VisibilityTimeoutSeconds: 360, // 6 minutes (Lambda timeout * 6)
                    MessageRetentionPeriod: 1209600, // 14 days
                    RedrivePolicy: {
                        deadLetterTargetArn: { "Fn::GetAtt": ["AppointmentPeDlq", "Arn"] },
                        maxReceiveCount: 3,
                    },
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                        {
                            Key: "Country",
                            Value: "PE",
                        },
                    ],
                },
            },

            // DLQ for Peru appointments
            AppointmentPeDlq: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-pe-dlq-${self:provider.stage}",
                    MessageRetentionPeriod: 1209600, // 14 days
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                        {
                            Key: "Country",
                            Value: "PE",
                        },
                    ],
                },
            },

            // SQS Queue for Chile appointments
            AppointmentClQueue: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-cl-${self:provider.stage}",
                    VisibilityTimeoutSeconds: 360, // 6 minutes
                    MessageRetentionPeriod: 1209600, // 14 days
                    RedrivePolicy: {
                        deadLetterTargetArn: { "Fn::GetAtt": ["AppointmentClDlq", "Arn"] },
                        maxReceiveCount: 3,
                    },
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                        {
                            Key: "Country",
                            Value: "CL",
                        },
                    ],
                },
            },

            // DLQ for Chile appointments
            AppointmentClDlq: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-cl-dlq-${self:provider.stage}",
                    MessageRetentionPeriod: 1209600, // 14 days
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                        {
                            Key: "Country",
                            Value: "CL",
                        },
                    ],
                },
            },

            // SQS Queue for completion notifications
            AppointmentCompletionQueue: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-completion-${self:provider.stage}",
                    VisibilityTimeoutSeconds: 180, // 3 minutes
                    MessageRetentionPeriod: 1209600, // 14 days
                    RedrivePolicy: {
                        deadLetterTargetArn: { "Fn::GetAtt": ["AppointmentCompletionDlq", "Arn"] },
                        maxReceiveCount: 3,
                    },
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                    ],
                },
            },

            // DLQ for completion notifications
            AppointmentCompletionDlq: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-completion-dlq-${self:provider.stage}",
                    MessageRetentionPeriod: 1209600, // 14 days
                    Tags: [
                        {
                            Key: "Service",
                            Value: "${self:service}",
                        },
                        {
                            Key: "Stage",
                            Value: "${self:provider.stage}",
                        },
                    ],
                },
            },

            // SNS Subscription for Peru (with filter policy)
            AppointmentPeSubscription: {
                Type: "AWS::SNS::Subscription",
                Properties: {
                    Protocol: "sqs",
                    TopicArn: { Ref: "AppointmentNotificationsTopic" },
                    Endpoint: { "Fn::GetAtt": ["AppointmentPeQueue", "Arn"] },
                    FilterPolicy: {
                        countryISO: ["PE"],
                    },
                    RawMessageDelivery: true,
                },
            },

            // SNS Subscription for Chile (with filter policy)
            AppointmentClSubscription: {
                Type: "AWS::SNS::Subscription",
                Properties: {
                    Protocol: "sqs",
                    TopicArn: { Ref: "AppointmentNotificationsTopic" },
                    Endpoint: { "Fn::GetAtt": ["AppointmentClQueue", "Arn"] },
                    FilterPolicy: {
                        countryISO: ["CL"],
                    },
                    RawMessageDelivery: true,
                },
            },

            // SQS Queue Policy to allow SNS to send messages
            AppointmentPeQueuePolicy: {
                Type: "AWS::SQS::QueuePolicy",
                Properties: {
                    Queues: [{ Ref: "AppointmentPeQueue" }],
                    PolicyDocument: {
                        Statement: [
                            {
                                Effect: "Allow",
                                Principal: {
                                    Service: "sns.amazonaws.com",
                                },
                                Action: "sqs:SendMessage",
                                Resource: { "Fn::GetAtt": ["AppointmentPeQueue", "Arn"] },
                                Condition: {
                                    ArnEquals: {
                                        "aws:SourceArn": { Ref: "AppointmentNotificationsTopic" },
                                    },
                                },
                            },
                        ],
                    },
                },
            },

            AppointmentClQueuePolicy: {
                Type: "AWS::SQS::QueuePolicy",
                Properties: {
                    Queues: [{ Ref: "AppointmentClQueue" }],
                    PolicyDocument: {
                        Statement: [
                            {
                                Effect: "Allow",
                                Principal: {
                                    Service: "sns.amazonaws.com",
                                },
                                Action: "sqs:SendMessage",
                                Resource: { "Fn::GetAtt": ["AppointmentClQueue", "Arn"] },
                                Condition: {
                                    ArnEquals: {
                                        "aws:SourceArn": { Ref: "AppointmentNotificationsTopic" },
                                    },
                                },
                            },
                        ],
                    },
                },
            },

            // EventBridge Rule to route appointment confirmation events
            AppointmentConfirmedRule: {
                Type: "AWS::Events::Rule",
                Properties: {
                    Name: "${self:service}-appointment-confirmed-${self:provider.stage}",
                    Description: "Route appointment confirmation events to completion queue",
                    EventPattern: {
                        source: ["rimac.appointment"],
                        "detail-type": ["AppointmentConfirmed"],
                    },
                    State: "ENABLED",
                    Targets: [
                        {
                            Id: "AppointmentCompletionTarget",
                            Arn: { "Fn::GetAtt": ["AppointmentCompletionQueue", "Arn"] },
                            SqsParameters: {
                                MessageGroupId: "appointment-completion",
                            },
                        },
                    ],
                },
            },

            // EventBridge permission to send messages to SQS
            AppointmentCompletionQueuePolicy: {
                Type: "AWS::SQS::QueuePolicy",
                Properties: {
                    Queues: [{ Ref: "AppointmentCompletionQueue" }],
                    PolicyDocument: {
                        Statement: [
                            {
                                Effect: "Allow",
                                Principal: {
                                    Service: "events.amazonaws.com",
                                },
                                Action: "sqs:SendMessage",
                                Resource: { "Fn::GetAtt": ["AppointmentCompletionQueue", "Arn"] },
                                Condition: {
                                    ArnEquals: {
                                        "aws:SourceArn": { "Fn::GetAtt": ["AppointmentConfirmedRule", "Arn"] },
                                    },
                                },
                            },
                        ],
                    },
                },
            },
        },
        Outputs: {
            AppointmentsTableName: {
                Value: { Ref: "AppointmentsTable" },
                Export: {
                    Name: "${self:service}-appointments-table-${self:provider.stage}",
                },
            },
            AppointmentNotificationsTopicArn: {
                Value: { Ref: "AppointmentNotificationsTopic" },
                Export: {
                    Name: "${self:service}-sns-topic-${self:provider.stage}",
                },
            },
            AppointmentPeQueueUrl: {
                Value: { Ref: "AppointmentPeQueue" },
                Export: {
                    Name: "${self:service}-sqs-pe-${self:provider.stage}",
                },
            },
            AppointmentClQueueUrl: {
                Value: { Ref: "AppointmentClQueue" },
                Export: {
                    Name: "${self:service}-sqs-cl-${self:provider.stage}",
                },
            },
            AppointmentCompletionQueueUrl: {
                Value: { Ref: "AppointmentCompletionQueue" },
                Export: {
                    Name: "${self:service}-sqs-completion-${self:provider.stage}",
                },
            },
        },
    },
    custom: {
        esbuild: {
            bundle: true,
            minify: false,
            sourcemap: true,
            exclude: ["aws-sdk"],
            target: "node22",
            define: { "require.resolve": undefined },
            platform: "node",
            concurrency: 10,
            format: "esm",
            mainFields: ["module", "main"],
            banner: {
                js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
            },
        },
    },
};

export default serverlessConfiguration;
