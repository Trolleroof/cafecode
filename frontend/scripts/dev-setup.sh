#!/bin/bash

# Development Setup Script
# This script helps you quickly configure your development environment

echo "🚀 Development Setup Script"
echo "=========================="

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "✅ .env.local found - using localhost backend"
    USE_LOCALHOST=true
else
    echo "🌐 No .env.local found - using Render backend"
    USE_LOCALHOST=false
fi

if [ "$USE_LOCALHOST" = true ]; then
    echo ""
    echo "📋 Available Development Configurations:"
    echo "1. minimal    - Core functionality only"
    echo "2. guided     - Core + Guided learning"
    echo "3. leetcode   - Core + LeetCode practice"
    echo "4. full       - Everything enabled"
    echo "5. custom     - Manual configuration"
    echo ""
    
    read -p "Choose configuration (1-5): " choice
    
    case $choice in
        1)
            echo "🔧 Applying minimal configuration..."
            echo "💡 Set ROUTE_CONFIG to DEV_CONFIGS.minimal in api.ts"
            echo ""
            echo "📝 Copy this to lib/api.ts ROUTE_CONFIG:"
            echo "const ROUTE_CONFIG = {"
            echo "  code: { run: true, analyze: true, fix: true },"
            echo "  python: { run: true },"
            echo "  guided: { startProject: false, analyzeStep: false, simpleChat: false, recap: false },"
            echo "  hint: { getHint: false },"
            echo "  translate: { translate: false },"
            echo "  leetcode: { assigned: false, testcases: false, startProblem: false, chat: false, analyzeStep: false, structured: false, similar: false },"
            echo "};"
            ;;
        2)
            echo "🔧 Applying guided configuration..."
            echo "💡 Set ROUTE_CONFIG to DEV_CONFIGS.guided in api.ts"
            ;;
        3)
            echo "🔧 Applying leetcode configuration..."
            echo "💡 Set ROUTE_CONFIG to DEV_CONFIGS.leetcode in api.ts"
            ;;
        4)
            echo "🔧 Applying full configuration..."
            echo "💡 Set ROUTE_CONFIG to DEV_CONFIGS.full in api.ts"
            ;;
        5)
            echo "🔧 Manual configuration mode..."
            echo "💡 Edit ROUTE_CONFIG in lib/api.ts manually"
            ;;
        *)
            echo "❌ Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    echo "📝 Next steps:"
    echo "1. Update ROUTE_CONFIG in lib/api.ts with your chosen configuration"
    echo "2. Restart your development server: npm run dev"
    echo "3. Check browser console for disabled routes"
else
    echo ""
    echo "💡 To use localhost backend:"
    echo "   echo 'NEXT_PUBLIC_USE_LOCALHOST=true' > .env.local"
    echo "   npm run dev"
fi 