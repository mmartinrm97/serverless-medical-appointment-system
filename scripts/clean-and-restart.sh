#!/bin/bash

# Clean restart script for E2E tests

echo "🧹 Cleaning and restarting Docker environment for E2E tests..."

# Stop and remove containers
echo "🛑 Stopping existing containers..."
docker compose down

# Remove volumes to ensure clean data
echo "🗑️  Removing Docker volumes for clean data..."
docker compose down -v

# Remove any dangling images/containers
echo "🧽 Cleaning up Docker artifacts..."
docker system prune -f

# Start fresh environment
echo "🚀 Starting fresh environment..."
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

echo "🎉 Clean environment is ready for E2E tests!"
echo ""
echo "💡 Next steps:"
echo "   - Serverless offline will start automatically"
echo "   - E2E tests will run after 15 seconds delay"
echo "   - Use Ctrl+C to stop both processes"
