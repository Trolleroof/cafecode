const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual Supabase values
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getToken() {
  try {
    // Replace with your test user credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword'
    });
    
    if (error) {
      console.error('Authentication failed:', error.message);
      return;
    }
    
    console.log('JWT Token:');
    console.log(data.session.access_token);
    
    // Test the API with the token
    const response = await fetch('https://cafecode-bacend.fly.dev/api/leetcode/assigned', {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

getToken(); 