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
            USERS_TABLE: "${self:service}-users-${self:provider.stage}",
        },
        iam: {
            role: {
                statements: [
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
                            "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${self:service}-users-${self:provider.stage}",
                            "arn:aws:dynamodb:${aws:region}:${aws:accountId}:table/${self:service}-appointments-${self:provider.stage}",
                        ],
                    },
                ],
            },
        },
    },
    functions: {
        createUser: {
            handler: "src/handler.createUser",
            events: [
                {
                    http: {
                        method: "post",
                        path: "/users",
                        cors: true,
                    },
                },
            ],
        },
        getUser: {
            handler: "src/handler.getUser",
            events: [
                {
                    http: {
                        method: "get",
                        path: "/users/{userId}",
                        cors: true,
                    },
                },
            ],
        },
    },
    resources: {
        Resources: {
            UsersTable: {
                Type: "AWS::DynamoDB::Table",
                Properties: {
                    TableName: "${self:service}-users-${self:provider.stage}",
                    AttributeDefinitions: [
                        {
                            AttributeName: "userId",
                            AttributeType: "S",
                        },
                    ],
                    KeySchema: [
                        {
                            AttributeName: "userId",
                            KeyType: "HASH",
                        },
                    ],
                    BillingMode: "PAY_PER_REQUEST",
                    StreamSpecification: {
                        StreamViewType: "NEW_AND_OLD_IMAGES",
                    },
                },
            },
            AppointmentsTable: {
                Type: "AWS::DynamoDB::Table",
                Properties: {
                    TableName: "${self:service}-appointments-${self:provider.stage}",
                    AttributeDefinitions: [
                        {
                            AttributeName: "appointmentId",
                            AttributeType: "S",
                        },
                        {
                            AttributeName: "userId",
                            AttributeType: "S",
                        },
                        {
                            AttributeName: "doctorId",
                            AttributeType: "S",
                        },
                        {
                            AttributeName: "dateTime",
                            AttributeType: "S",
                        },
                    ],
                    KeySchema: [
                        {
                            AttributeName: "appointmentId",
                            KeyType: "HASH",
                        },
                    ],
                    GlobalSecondaryIndexes: [
                        {
                            IndexName: "UserIndex",
                            KeySchema: [
                                {
                                    AttributeName: "userId",
                                    KeyType: "HASH",
                                },
                                {
                                    AttributeName: "dateTime",
                                    KeyType: "RANGE",
                                },
                            ],
                            Projection: {
                                ProjectionType: "ALL",
                            },
                        },
                        {
                            IndexName: "DoctorIndex",
                            KeySchema: [
                                {
                                    AttributeName: "doctorId",
                                    KeyType: "HASH",
                                },
                                {
                                    AttributeName: "dateTime",
                                    KeyType: "RANGE",
                                },
                            ],
                            Projection: {
                                ProjectionType: "ALL",
                            },
                        },
                    ],
                    BillingMode: "PAY_PER_REQUEST",
                    StreamSpecification: {
                        StreamViewType: "NEW_AND_OLD_IMAGES",
                    },
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
