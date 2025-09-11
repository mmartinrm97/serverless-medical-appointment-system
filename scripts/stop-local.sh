#!/bin/bash

echo "🛑 Stopping Medical Appointments API Local Development Environment"

echo "📦 Stopping containers..."
docker compose down

echo "🧹 Cleaning up volumes (optional - uncomment to remove data)..."
# docker compose down -v

echo "✅ Local environment stopped!"
