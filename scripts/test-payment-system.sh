#!/bin/bash

echo "🧪 Testing Stripe Payment System Setup"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project root directory found"

# Check environment variables
echo ""
echo "🔍 Checking Environment Variables..."

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY not set"
else
    echo "✅ STRIPE_SECRET_KEY is set"
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "❌ STRIPE_WEBHOOK_SECRET not set"
else
    echo "✅ STRIPE_WEBHOOK_SECRET is set"
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL not set"
else
    echo "✅ SUPABASE_URL is set"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ SUPABASE_ANON_KEY not set"
else
    echo "✅ SUPABASE_ANON_KEY is set"
fi

# Check if backend is running
echo ""
echo "🔍 Checking Backend Status..."

if curl -s http://localhost:8000/api/stripe/session/test > /dev/null 2>&1; then
    echo "✅ Backend is running on port 8000"
else
    echo "❌ Backend is not running on port 8000"
    echo "   Start it with: cd backend && npm start"
fi

# Check if frontend is running
echo ""
echo "🔍 Checking Frontend Status..."

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend is not running on port 3000"
    echo "   Start it with: cd frontend && npm run dev"
fi

# Check database migration
echo ""
echo "🔍 Checking Database Migration..."

if [ -f "supabase/migrations/20250630000000_add_payment_and_projects.sql" ]; then
    echo "✅ Payment migration file exists"
else
    echo "❌ Payment migration file not found"
    echo "   Run: supabase db push"
fi

# Check Stripe webhook endpoint
echo ""
echo "🔍 Testing Stripe Webhook Endpoint..."

WEBHOOK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/stripe/webhook)
if [ "$WEBHOOK_RESPONSE" = "400" ]; then
    echo "✅ Webhook endpoint responds (400 expected for missing signature)"
elif [ "$WEBHOOK_RESPONSE" = "000" ]; then
    echo "❌ Webhook endpoint not accessible"
else
    echo "✅ Webhook endpoint responds with status: $WEBHOOK_RESPONSE"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Visit http://localhost:3000/payment-test to test the payment flow"
echo "2. Create 3 test projects to see the payment modal"
echo "3. Test Stripe checkout with test card: 4242 4242 4242 4242"
echo "4. Check webhook delivery in Stripe dashboard"
echo ""
echo "📚 For detailed setup instructions, see PAYMENT_SETUP.md"
echo "🚨 Make sure all environment variables are set before testing!"
