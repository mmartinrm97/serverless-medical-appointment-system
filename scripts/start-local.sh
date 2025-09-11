#!/bin/bash

# Local development setup script

echo "🚀 Starting Medical Appointments API Local Development Environment"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting LocalStack and MySQL databases..."
docker compose up -d

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:4566/_localstack/health > /dev/null 2>&1; then
        echo "✅ LocalStack is ready!"
        break
    fi
    counter=$((counter + 1))
    sleep 1
done

if [ $counter -eq $timeout ]; then
    echo "❌ LocalStack failed to start within $timeout seconds"
    exit 1
fi

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL databases to be ready..."
sleep 10

# Create AWS resources in LocalStack
echo "🛠️  Creating AWS resources in LocalStack..."
node scripts/setup-localstack.js

echo "🎉 Local environment is ready!"
echo ""
echo "📋 Available services:"
echo "   - LocalStack (AWS services): http://localhost:4566"
echo "   - MySQL PE database: localhost:3307"
echo "   - MySQL CL database: localhost:3308"
echo ""
echo "🚀 To start the serverless API:"
echo "   pnpm run dev:local"
echo ""
echo "🧪 To run tests with LocalStack:"
echo "   pnpm run test:local"
