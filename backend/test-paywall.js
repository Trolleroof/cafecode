import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testPaywallLogic() {
  console.log('🧪 Testing Paywall Logic...\n');
  
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Supabase environment variables not configured');
    console.log('Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env file');
    return;
  }
  
  console.log('✅ Supabase configured');
  
  try {
    // Use a valid UUID format for testing
    const testUserId = '123e4567-e89b-12d3-a456-426614174000';
    
    console.log(`\n🔍 Testing with user: ${testUserId}`);
    
    // Check if user has paid
    console.log('1. Checking payment status...');
    const { data: payment, error: paymentError } = await supabase
      .from('user_payments')
      .select('status')
      .eq('user_id', testUserId)
      .eq('status', 'completed')
      .single();
    
    if (paymentError) {
      if (paymentError.code === 'PGRST116') {
        console.log('ℹ️  No payment found for this user');
      } else {
        console.error('❌ Error checking payment:', paymentError.message);
      }
    } else if (payment) {
      console.log('✅ User has paid - unlimited access granted');
    }
    
    // Check project count
    console.log('\n2. Checking project count...');
    const { data: projectCount, error: countError } = await supabase
      .from('user_project_counts')
      .select('project_count')
      .eq('user_id', testUserId)
      .single();
    
    if (countError) {
      if (countError.code === 'PGRST116') {
        console.log('ℹ️  No project count found for this user (first time user)');
        console.log('✅ User can create their first free project');
      } else {
        console.error('❌ Error checking project count:', countError.message);
      }
    } else {
      const currentCount = projectCount?.project_count || 0;
      console.log(`📊 Current project count: ${currentCount}`);
      
      if (currentCount >= 1) {
        console.log('🚫 User has exceeded free limit - paywall should appear');
      } else {
        console.log('✅ User can create free project');
      }
    }
    
    console.log('\n🎉 Paywall logic test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPaywallLogic();
