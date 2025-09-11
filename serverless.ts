import type { AWS } from "@serverless/typescript";

const serverlessConfiguration: AWS = {
    service: "medical-appointments-api",
    frameworkVersion: "4",
    useDotenv: true,
    build: {
        esbuild: {
            bundle: true,
            minify: false,
            sourcemap: {
                type: "linked",
                setNodeOptions: true
            },
            external: [
                // AWS SDK v3 packages - externalize to avoid bundling issues
                '@aws-sdk/client-dynamodb',
                '@aws-sdk/client-sns',
                '@aws-sdk/client-sqs',
                '@aws-sdk/client-eventbridge',
                '@aws-sdk/client-secrets-manager',
                '@aws-sdk/client-ssm',
                // Database drivers that should remain external
                'mysql2',
                'mysql2/promise',
                // Logging libraries - externalize to avoid ESM/CommonJS conflicts
                'pino',
                'pino-pretty',
                // Other packages that might cause bundling issues
                'aws-lambda'
            ],
        }
    },
    plugins: [

        "serverless-offline",
        "serverless-localstack",
    ],

    // ---------- Stage-aware parameters ----------
    // dev: reads strictly from env
    // prod/staging: SSM first, fallback to env if missing
    params: {
        default: {
            STAGE: "${opt:stage, 'dev'}",
            REGION: "${opt:region, env:AWS_DEFAULT_REGION, 'us-east-1'}",

            // Production tuning via CLI: 
            // sls deploy --stage prod --memory 512 --sqsTimeout 600 --apiThrottle 200
            DEFAULT_MEMORY: "${opt:memory, env:DEFAULT_MEMORY, '256'}",
            DEFAULT_TIMEOUT: "${opt:timeout, env:DEFAULT_TIMEOUT, '30'}",
            API_COMPRESSION: "${opt:compression, env:API_COMPRESSION, '1024'}",

            // SQS tuning parameters
            SQS_VISIBILITY_TIMEOUT: "${opt:sqsTimeout, env:SQS_VISIBILITY_TIMEOUT, '360'}",
            SQS_MAX_RECEIVE: "${opt:sqsMaxReceive, env:SQS_MAX_RECEIVE, '3'}",
            SQS_LONG_POLLING: "${opt:sqsPolling, env:SQS_LONG_POLLING, '20'}",

            // API Gateway throttling
            API_RATE_LIMIT: "${opt:apiRate, env:API_RATE_LIMIT, '100'}",
            API_BURST_LIMIT: "${opt:apiBurst, env:API_BURST_LIMIT, '200'}",

            // Centralized event bus
            EVENT_BUS_NAME: "${opt:eventBus, env:EVENT_BUS_NAME, 'default'}",

            // Environment tags
            OWNER: "${opt:owner, env:OWNER, 'Backend-Team'}",
            COST_CENTER: "${opt:costCenter, env:COST_CENTER, 'Medical-Apps'}",
        },

        dev: {
            DB_HOST_PE: "${env:DB_HOST_PE, '127.0.0.1'}",
            DB_PORT_PE: "${env:DB_PORT_PE, '3306'}",
            DB_NAME_PE: "${env:DB_NAME_PE, 'medical_pe'}",
            DB_USER_PE: "${env:DB_USER_PE, 'root'}",
            DB_PASSWORD_PE: "${env:DB_PASSWORD_PE, 'password'}",

            DB_HOST_CL: "${env:DB_HOST_CL, '127.0.0.1'}",
            DB_PORT_CL: "${env:DB_PORT_CL, '3306'}",
            DB_NAME_CL: "${env:DB_NAME_CL, 'medical_cl'}",
            DB_USER_CL: "${env:DB_USER_CL, 'root'}",
            DB_PASSWORD_CL: "${env:DB_PASSWORD_CL, 'password'}",

            // Optional locally (only if your code actually calls Secrets Manager)
            DB_SECRET_ARN_PE: "${env:DB_SECRET_ARN_PE, ''}",
            DB_SECRET_ARN_CL: "${env:DB_SECRET_ARN_CL, ''}",
        },

        staging: {
            DB_HOST_PE: "${ssm:/medical-appointments/staging/db/host/pe, env:DB_HOST_PE}",
            DB_PORT_PE: "${ssm:/medical-appointments/staging/db/port/pe, env:DB_PORT_PE}",
            DB_NAME_PE: "${ssm:/medical-appointments/staging/db/name/pe, env:DB_NAME_PE}",
            DB_USER_PE: "${ssm:/medical-appointments/staging/db/user/pe, env:DB_USER_PE}",
            DB_PASSWORD_PE: "${ssm:/medical-appointments/staging/db/password/pe, env:DB_PASSWORD_PE}",

            DB_HOST_CL: "${ssm:/medical-appointments/staging/db/host/cl, env:DB_HOST_CL}",
            DB_PORT_CL: "${ssm:/medical-appointments/staging/db/port/cl, env:DB_PORT_CL}",
            DB_NAME_CL: "${ssm:/medical-appointments/staging/db/name/cl, env:DB_NAME_CL}",
            DB_USER_CL: "${ssm:/medical-appointments/staging/db/user/cl, env:DB_USER_CL}",
            DB_PASSWORD_CL: "${ssm:/medical-appointments/staging/db/password/cl, env:DB_PASSWORD_CL}",

            DB_SECRET_ARN_PE: "${ssm:/medical-appointments/staging/rds/pe/secret-arn, env:DB_SECRET_ARN_PE}",
            DB_SECRET_ARN_CL: "${ssm:/medical-appointments/staging/rds/cl/secret-arn, env:DB_SECRET_ARN_CL}",
        },

        prod: {
            DB_HOST_PE: "${ssm:/medical-appointments/prod/db/host/pe, env:DB_HOST_PE}",
            DB_PORT_PE: "${ssm:/medical-appointments/prod/db/port/pe, env:DB_PORT_PE}",
            DB_NAME_PE: "${ssm:/medical-appointments/prod/db/name/pe, env:DB_NAME_PE}",
            DB_USER_PE: "${ssm:/medical-appointments/prod/db/user/pe, env:DB_USER_PE}",
            DB_PASSWORD_PE: "${ssm:/medical-appointments/prod/db/password/pe, env:DB_PASSWORD_PE}",

            DB_HOST_CL: "${ssm:/medical-appointments/prod/db/host/cl, env:DB_HOST_CL}",
            DB_PORT_CL: "${ssm:/medical-appointments/prod/db/port/cl, env:DB_PORT_CL}",
            DB_NAME_CL: "${ssm:/medical-appointments/prod/db/name/cl, env:DB_NAME_CL}",
            DB_USER_CL: "${ssm:/medical-appointments/prod/db/user/cl, env:DB_USER_CL}",
            DB_PASSWORD_CL: "${ssm:/medical-appointments/prod/db/password/cl, env:DB_PASSWORD_CL}",

            DB_SECRET_ARN_PE: "${ssm:/medical-appointments/prod/rds/pe/secret-arn, env:DB_SECRET_ARN_PE}",
            DB_SECRET_ARN_CL: "${ssm:/medical-appointments/prod/rds/cl/secret-arn, env:DB_SECRET_ARN_CL}",
        },
    },
    // -------------------------------------------

    provider: {
        name: "aws",
        runtime: "nodejs22.x",
        region: "${param:REGION}" as AWS["provider"]["region"],
        stage: "${param:STAGE}",

        // Global defaults for all Lambdas
        memorySize: "${param:DEFAULT_MEMORY}" as unknown as number,
        timeout: "${param:DEFAULT_TIMEOUT}" as unknown as number,

        apiGateway: {
            minimumCompressionSize: "${param:API_COMPRESSION}" as unknown as number,
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
            EVENT_BUS_NAME: "${param:EVENT_BUS_NAME}",

            // DB (via params)
            DB_HOST_PE: "${param:DB_HOST_PE}",
            DB_HOST_CL: "${param:DB_HOST_CL}",
            DB_PORT_PE: "${param:DB_PORT_PE}",
            DB_PORT_CL: "${param:DB_PORT_CL}",
            DB_NAME_PE: "${param:DB_NAME_PE}",
            DB_NAME_CL: "${param:DB_NAME_CL}",
            DB_USER_PE: "${param:DB_USER_PE}",
            DB_USER_CL: "${param:DB_USER_CL}",
            DB_PASSWORD_PE: "${param:DB_PASSWORD_PE}",
            DB_PASSWORD_CL: "${param:DB_PASSWORD_CL}",
            DB_SECRET_ARN_PE: "${param:DB_SECRET_ARN_PE}",
            DB_SECRET_ARN_CL: "${param:DB_SECRET_ARN_CL}",
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
                    // EventBridge permissions - Dynamic event bus support
                    {
                        Effect: "Allow",
                        Action: [
                            "events:PutEvents",
                        ],
                        Resource: [
                            "arn:aws:events:${aws:region}:${aws:accountId}:event-bus/${param:EVENT_BUS_NAME}",
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
                    // CloudWatch Logs permissions (for custom alarms)
                    {
                        Effect: "Allow",
                        Action: [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                        ],
                        Resource: [
                            "arn:aws:logs:${aws:region}:${aws:accountId}:*",
                        ],
                    },
                ],
            },
        },
        logRetentionInDays: 14,
        tracing: {
            lambda: true,
            apiGateway: true
        },
        stackTags: {
            Service: "${self:service}",
            Stage: "${self:provider.stage}",
            Owner: "${param:OWNER}",
            CostCenter: "${param:COST_CENTER}"
        },
        tags: {
            Service: "${self:service}",
            Stage: "${self:provider.stage}"
        },
    },
    functions: {
        // Main appointment Lambda - handles API endpoints and completion
        // ✅ Inherits memorySize and timeout from provider (256MB, 30s)
        appointment: {
            handler: "src/modules/appointments/interfaces/http/postAppointment.handler",
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
        // ✅ Inherits memorySize and timeout from provider (256MB, 30s)
        getAppointments: {
            handler: "src/modules/appointments/interfaces/http/getAppointments.handler",
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
        // ✅ Inherits memorySize from provider (256MB), override timeout for SQS
        appointmentCompletion: {
            handler: "src/modules/appointments/interfaces/sqs/processCompletedAppointmentQueue.handler",
            timeout: 60, // Override: SQS processing needs more time
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
        // ✅ Explicit override: needs more resources for heavy processing
        appointmentPe: {
            handler: "src/modules/appointments/interfaces/sqs/processPendingAppointmentQueue.handler",
            timeout: 60,     // Override: SQS + RDS operations need more time
            memorySize: 512, // Override: Heavy processing needs more memory
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
        // ✅ Explicit override: needs more resources for heavy processing
        appointmentCl: {
            handler: "src/modules/appointments/interfaces/sqs/processPendingAppointmentQueue.handler",
            timeout: 60,     // Override: SQS + RDS operations need more time
            memorySize: 512, // Override: Heavy processing needs more memory
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
                        {
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
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
                        {
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
                        },
                    ],
                },
            },

            // SQS Queue for Peru appointments
            AppointmentPeQueue: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-pe-${self:provider.stage}",
                    VisibilityTimeoutSeconds: "${param:SQS_VISIBILITY_TIMEOUT}",
                    MessageRetentionPeriod: 1209600, // 14 days
                    ReceiveMessageWaitTimeSeconds: "${param:SQS_LONG_POLLING}", // Long polling optimization
                    RedrivePolicy: {
                        deadLetterTargetArn: { "Fn::GetAtt": ["AppointmentPeDlq", "Arn"] },
                        maxReceiveCount: "${param:SQS_MAX_RECEIVE}",
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
                        {
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
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
                        {
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
                        },
                    ],
                },
            },

            // SQS Queue for Chile appointments
            AppointmentClQueue: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-cl-${self:provider.stage}",
                    VisibilityTimeoutSeconds: "${param:SQS_VISIBILITY_TIMEOUT}",
                    MessageRetentionPeriod: 1209600, // 14 days
                    ReceiveMessageWaitTimeSeconds: "${param:SQS_LONG_POLLING}", // Long polling optimization
                    RedrivePolicy: {
                        deadLetterTargetArn: { "Fn::GetAtt": ["AppointmentClDlq", "Arn"] },
                        maxReceiveCount: "${param:SQS_MAX_RECEIVE}",
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
                        {
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
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
                        {
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
                        },
                    ],
                },
            },

            // SQS Queue for completion notifications - Optimized for faster processing
            AppointmentCompletionQueue: {
                Type: "AWS::SQS::Queue",
                Properties: {
                    QueueName: "${self:service}-appointment-completion-${self:provider.stage}",
                    VisibilityTimeoutSeconds: 180, // 3 minutes - faster for completion processing
                    MessageRetentionPeriod: 1209600, // 14 days
                    ReceiveMessageWaitTimeSeconds: "${param:SQS_LONG_POLLING}", // Long polling optimization
                    RedrivePolicy: {
                        deadLetterTargetArn: { "Fn::GetAtt": ["AppointmentCompletionDlq", "Arn"] },
                        maxReceiveCount: "${param:SQS_MAX_RECEIVE}",
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
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
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
                        {
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
                        },
                    ],
                },
            },

            // CloudWatch Alarm for DLQ monitoring
            AppointmentDlqAlarm: {
                Type: "AWS::CloudWatch::Alarm",
                Properties: {
                    AlarmName: "${self:service}-dlq-messages-${self:provider.stage}",
                    AlarmDescription: "Alert when messages appear in Peru DLQ",
                    MetricName: "ApproximateNumberOfVisibleMessages",
                    Namespace: "AWS/SQS",
                    Statistic: "Sum",
                    Period: 300,
                    EvaluationPeriods: 1,
                    Threshold: 1,
                    ComparisonOperator: "GreaterThanOrEqualToThreshold",
                    Dimensions: [
                        {
                            Name: "QueueName",
                            Value: { "Fn::GetAtt": ["AppointmentPeDlq", "QueueName"] }
                        }
                    ],
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
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
                        },
                    ],
                },
            },

            // CloudWatch Alarm for Chile DLQ monitoring
            AppointmentClDlqAlarm: {
                Type: "AWS::CloudWatch::Alarm",
                Properties: {
                    AlarmName: "${self:service}-cl-dlq-messages-${self:provider.stage}",
                    AlarmDescription: "Alert when messages appear in Chile DLQ",
                    MetricName: "ApproximateNumberOfVisibleMessages",
                    Namespace: "AWS/SQS",
                    Statistic: "Sum",
                    Period: 300,
                    EvaluationPeriods: 1,
                    Threshold: 1,
                    ComparisonOperator: "GreaterThanOrEqualToThreshold",
                    Dimensions: [
                        {
                            Name: "QueueName",
                            Value: { "Fn::GetAtt": ["AppointmentClDlq", "QueueName"] }
                        }
                    ],
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
                            Key: "Owner",
                            Value: "${param:OWNER}",
                        },
                        {
                            Key: "CostCenter",
                            Value: "${param:COST_CENTER}",
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
        localstack: {
            stages: ["dev"],
            host: "http://localhost",
            edgePort: 4566,
            autostart: false,
            lambda: {
                mountCode: false,
            },
            docker: {
                sudo: false,
            },
        },
        "serverless-offline": {
            httpPort: 3000,
            babelOptions: {
                presets: ["env"]
            }
        }
    },
};

export default serverlessConfiguration;