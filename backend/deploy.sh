#!/bin/bash

# Deploy script for Fly.io backend
echo "🚀 Deploying backend to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if we're logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: flyctl auth login"
    exit 1
fi

# Deploy the app
echo "📦 Building and deploying..."
flyctl deploy

# Check deployment status
echo "🔍 Checking deployment status..."
flyctl status

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://cafecode-backend-v2.fly.dev"
echo "🔧 Health check: https://cafecode-backend-v2.fly.dev/health"
