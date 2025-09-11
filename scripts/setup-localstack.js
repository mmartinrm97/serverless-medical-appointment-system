/**
 * Setup AWS resources in LocalStack for local development
 */

import { 
    DynamoDBClient, 
    CreateTableCommand, 
    DescribeTableCommand 
} from '@aws-sdk/client-dynamodb';
import { 
    SNSClient, 
    CreateTopicCommand, 
    SubscribeCommand
} from '@aws-sdk/client-sns';
import { 
    SQSClient, 
    CreateQueueCommand,
    GetQueueUrlCommand 
} from '@aws-sdk/client-sqs';
import { 
    EventBridgeClient, 
    PutRuleCommand, 
    PutTargetsCommand 
} from '@aws-sdk/client-eventbridge';
import {
    SSMClient,
    PutParameterCommand
} from '@aws-sdk/client-ssm';
import {
    SecretsManagerClient,
    CreateSecretCommand
} from '@aws-sdk/client-secrets-manager';

// LocalStack configuration
const localStackConfig = {
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
    }
};

const dynamodb = new DynamoDBClient(localStackConfig);
const sns = new SNSClient(localStackConfig);
const sqs = new SQSClient(localStackConfig);
const eventbridge = new EventBridgeClient(localStackConfig);
const ssm = new SSMClient(localStackConfig);
const secretsManager = new SecretsManagerClient(localStackConfig);

async function setupLocalStack() {
    console.log('🛠️  Setting up AWS resources in LocalStack...');

    try {
        // 1. Create DynamoDB table
        await createDynamoDBTable();
        
        // 2. Create SQS queues
        const queues = await createSQSQueues();
        
        // 3. Create SNS topic and subscriptions
        await createSNSResources(queues);
        
        // 4. Create EventBridge rules
        await createEventBridgeResources(queues.completionQueueArn);
        
        // 5. Create SSM parameters
        await createSSMParameters();
        
        // 6. Create Secrets Manager secrets
        await createSecrets();
        
        console.log('✅ All AWS resources created successfully in LocalStack!');
        
    } catch (error) {
        console.error('❌ Error setting up LocalStack:', error);
        process.exit(1);
    }
}

async function createDynamoDBTable() {
    console.log('📋 Creating DynamoDB table...');
    
    try {
        await dynamodb.send(new DescribeTableCommand({ TableName: 'appointments-dev' }));
        console.log('   ✅ DynamoDB table already exists');
        return;
    } catch {
        // Table doesn't exist, create it
    }

    const command = new CreateTableCommand({
        TableName: 'appointments-dev',
        KeySchema: [
            { AttributeName: 'PK', KeyType: 'HASH' },
            { AttributeName: 'SK', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
            { AttributeName: 'PK', AttributeType: 'S' },
            { AttributeName: 'SK', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
    });

    await dynamodb.send(command);
    console.log('   ✅ DynamoDB table created');
}

async function createSQSQueues() {
    console.log('📬 Creating SQS queues...');
    
    const queues = {
        peQueue: 'appointment-pe-queue-dev',
        clQueue: 'appointment-cl-queue-dev',
        completionQueue: 'appointment-completion-queue-dev'
    };

    const queueData = {};

    for (const [key, queueName] of Object.entries(queues)) {
        // Create main queue
        const createCommand = new CreateQueueCommand({
            QueueName: queueName,
            Attributes: {
                'VisibilityTimeout': '300',
                'MessageRetentionPeriod': '1209600'
            }
        });
        
        await sqs.send(createCommand);
        
        // Get queue URL
        const urlCommand = new GetQueueUrlCommand({ QueueName: queueName });
        const urlResponse = await sqs.send(urlCommand);
        queueData[key + 'Url'] = urlResponse.QueueUrl;
        
        // Generate ARN for LocalStack (format: arn:aws:sqs:region:account:queue-name)
        queueData[key + 'Arn'] = `arn:aws:sqs:us-east-1:000000000000:${queueName}`;

        // Create DLQ
        const dlqName = queueName + '-dlq';
        await sqs.send(new CreateQueueCommand({
            QueueName: dlqName,
            Attributes: {
                'MessageRetentionPeriod': '1209600'
            }
        }));

        console.log(`   ✅ Created ${queueName} and ${dlqName}`);
    }

    return queueData;
}

async function createSNSResources(queues) {
    console.log('📢 Creating SNS topic and subscriptions...');
    
    // Create topic
    const topicCommand = new CreateTopicCommand({
        Name: 'appointment-notifications-dev'
    });
    const topicResponse = await sns.send(topicCommand);
    const topicArn = topicResponse.TopicArn;

    // Subscribe PE queue using ARN
    await sns.send(new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'sqs',
        Endpoint: queues.peQueueArn,
        Attributes: {
            FilterPolicy: JSON.stringify({ countryISO: ['PE'] })
        }
    }));

    // Subscribe CL queue using ARN
    await sns.send(new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'sqs',
        Endpoint: queues.clQueueArn,
        Attributes: {
            FilterPolicy: JSON.stringify({ countryISO: ['CL'] })
        }
    }));

    console.log('   ✅ SNS topic and subscriptions created');
    return topicArn;
}

async function createEventBridgeResources(completionQueueArn) {
    console.log('⚡ Creating EventBridge rules...');
    
    // Create rule
    const ruleCommand = new PutRuleCommand({
        Name: 'appointment-completion-rule-dev',
        EventPattern: JSON.stringify({
            source: ['rimac.appointment'],
            'detail-type': ['AppointmentConfirmed']
        }),
        State: 'ENABLED'
    });
    
    await eventbridge.send(ruleCommand);

    // Add target using ARN
    const targetsCommand = new PutTargetsCommand({
        Rule: 'appointment-completion-rule-dev',
        Targets: [{
            Id: '1',
            Arn: completionQueueArn,
        }]
    });
    
    await eventbridge.send(targetsCommand);
    console.log('   ✅ EventBridge rule and target created');
}

async function createSSMParameters() {
    console.log('⚙️  Creating SSM parameters...');
    
    const parameters = [
        {
            Name: '/medical-appointments/dev/vpc/subnet-ids',
            Value: 'subnet-12345,subnet-67890',
            Type: 'StringList'
        },
        {
            Name: '/medical-appointments/dev/vpc/security-group-id',
            Value: 'sg-12345678',
            Type: 'String'
        }
    ];

    for (const param of parameters) {
        await ssm.send(new PutParameterCommand({
            Name: param.Name,
            Value: param.Value,
            Type: param.Type,
            Overwrite: true
        }));
    }

    console.log('   ✅ SSM parameters created');
}

async function createSecrets() {
    console.log('🔐 Creating Secrets Manager secrets...');
    
    const secrets = [
        {
            Name: '/medical-appointments/dev/rds/pe/credentials',
            SecretString: JSON.stringify({
                host: 'localhost',
                port: 3307,
                database: 'appointments_pe',
                username: 'appointments',
                password: 'appointments123'
            })
        },
        {
            Name: '/medical-appointments/dev/rds/cl/credentials',
            SecretString: JSON.stringify({
                host: 'localhost',
                port: 3308,
                database: 'appointments_cl',
                username: 'appointments',
                password: 'appointments123'
            })
        }
    ];

    for (const secret of secrets) {
        try {
            await secretsManager.send(new CreateSecretCommand({
                Name: secret.Name,
                SecretString: secret.SecretString
            }));
        } catch (error) {
            if (error.name !== 'ResourceExistsException') {
                throw error;
            }
        }
    }

    console.log('   ✅ Secrets Manager secrets created');
}

// Run setup
setupLocalStack();
