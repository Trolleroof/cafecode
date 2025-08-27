

## 🔑 Step 1: Get Your Stripe API Keys

1. **Go to [stripe.com](https://stripe.com)** and create an account
2. **Navigate to Developers → API keys**
3. **Copy your Secret key** (starts with `sk_test_` for testing)
4. **Copy your Publishable key** (starts with `pk_test_` for testing)

## 🔧 Step 2: Configure Environment Variables

Create or update your `.env` file in the `backend` folder:



# Keep your existing environment variables...
GEMINI_API_KEY=your_gemini_api_key_here
```

## 🧪 Step 3: Test the Integration

Run the test script to verify everything works:

```bash
cd backend
node test-stripe.js
```

You should see:
```
🧪 Testing Stripe Integration...

✅ STRIPE_SECRET_KEY found
🔄 Testing checkout session creation...
✅ Checkout session created successfully!
   Session ID: cs_test_...
   Checkout URL: https://checkout.stripe.com/pay/cs_test_...
   Amount: $19.99
   Status: open
```

## 🌐 Step 4: Test the API Endpoints

### Test Checkout Creation:
```bash
curl -X POST http://localhost:8000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

### Test Session Retrieval:
```bash
curl http://localhost:8000/api/stripe/session/SESSION_ID_HERE
```

## 🎯 What You Get

✅ **Checkout Endpoint**: `/api/stripe/checkout` - Creates Stripe checkout sessions  
✅ **Session Endpoint**: `/api/stripe/session/:id` - Gets payment details  
✅ **Webhook Endpoint**: `/api/stripe/webhook` - Handles payment confirmations  
✅ **One-time Payment**: $19.99 for unlimited projects (no subscriptions)  

## 🔄 Next Steps

Once this is working, you'll need to:
1. **Add project counting** to track free vs paid users
2. **Create the paywall UI** in your frontend
3. **Handle webhooks** to unlock features after payment
4. **Test the complete flow** with Stripe test cards

## 🚨 Important Notes

- **Never commit your `.env` file** to git
- **Use test keys** during development
- **Test with Stripe test cards** before going live
- **Webhook secret** will be needed for production

## 🆘 Troubleshooting

**"Invalid API key" error:**
- Check your `.env` file has the correct key
- Make sure you're using test keys for development
- Verify the key hasn't been revoked

**"Module not found" error:**
- Run `npm install` to ensure Stripe is installed
- Check that all import paths are correct
