import dotenv from 'dotenv';
import { StripeService } from './services/StripeService.js';

// Load environment variables
dotenv.config();
console.log(process.env.STRIPE_SECRET_KEY)

async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration...\n');
  
  // Debug environment variables
  console.log('🔍 Environment Variable Debug:');
  console.log('   Current working directory:', process.cwd());
  console.log('   .env file loaded:', process.env.STRIPE_SECRET_KEY ? '✅ Yes' : '❌ No');
  console.log('   STRIPE_SECRET_KEY value:', process.env.STRIPE_SECRET_KEY || '❌ NOT FOUND');
  console.log('   STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.length : 0);
  console.log('   STRIPE_SECRET_KEY starts with:', process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 10) + '...' : 'N/A');
  console.log('   All STRIPE env vars:', Object.keys(process.env).filter(key => key.includes('STRIPE')));
  console.log('');
  
  // Check if Stripe key is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    console.log('Please add your Stripe secret key to your .env file');
    console.log('');
    console.log('💡 Troubleshooting tips:');
    console.log('   1. Make sure .env file is in the backend folder');
    console.log('   2. Check .env file format: STRIPE_SECRET_KEY=sk_test_...');
    console.log('   3. No spaces around = sign');
    console.log('   4. File is saved and readable');
    return;
  }
  
  console.log('✅ STRIPE_SECRET_KEY found');
  
  try {
    // Test creating a checkout session
    console.log('🔄 Testing checkout session creation...');
    const session = await StripeService.createCheckoutSession('test-user-123');
    
    console.log('✅ Checkout session created successfully!');
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Checkout URL: ${session.url}`);
    console.log(`   Amount: $${(session.amount_total / 100).toFixed(2)}`);
    console.log(`   Status: ${session.status}`);
    
    // Test getting session details
    console.log('\n🔄 Testing session retrieval...');
    const sessionDetails = await StripeService.getSessionDetails(session.id);
    console.log('✅ Session details retrieved successfully!');
    console.log(`   Payment Status: ${sessionDetails.payment_status}`);
    
    console.log('\n🎉 All Stripe tests passed! Your integration is working correctly.');
    
  } catch (error) {
    console.error('❌ Stripe test failed:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 This usually means:');
      console.log('   1. Your Stripe secret key is incorrect');
      console.log('   2. You\'re using a test key in production or vice versa');
      console.log('   3. The key has been revoked');
    }
  }
}

// Run the test
testStripeIntegration();
