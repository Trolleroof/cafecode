# Stripe Payment System Setup Guide

This guide covers the complete setup and implementation of the Stripe payment system for Cafécode, including project counting and payment verification.

## 🚀 What's Been Implemented

### Frontend Components
- **PaymentModal**: Beautiful payment modal with Stripe checkout integration
- **ProjectCounter**: Real-time project count display with upgrade prompts
- **PaymentSuccessHandler**: Handles Stripe redirects and payment verification
- **useProjectManager**: Hook for managing project creation and payment status

### Backend Services
- **StripeService**: Complete Stripe integration with checkout sessions
- **Stripe Routes**: API endpoints for checkout and webhook handling
- **Database Integration**: Supabase tables and functions for payment tracking

### Database Schema
- **profiles**: Extended with payment status and project count
- **user_projects**: Tracks individual user projects
- **payment_history**: Records Stripe payment transactions
- **Database Functions**: Automated project counting and limit checking

## 🛠️ Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Your Stripe webhook secret
FRONTEND_URL=http://localhost:3000 # Your frontend URL

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Database Migration

Run the new migration to create payment tables:

```bash
# Navigate to your Supabase project
cd supabase

# Apply the migration
supabase db push
```

Or manually run the SQL from `supabase/migrations/20250630000000_add_payment_and_projects.sql`

### 3. Stripe Dashboard Setup

1. **Create a Product**: Set up a $19.99 one-time payment product
2. **Configure Webhooks**: Add webhook endpoint pointing to `/api/stripe/webhook`
3. **Get API Keys**: Copy your publishable and secret keys

### 4. Install Dependencies

```bash
# Backend
cd backend
npm install @supabase/supabase-js

# Frontend
cd frontend
npm install @tabler/icons-react
```

## 🔄 How It Works

### Payment Flow
1. User creates 3 free projects
2. On 4th project, payment modal appears
3. User clicks "Upgrade Now" → redirected to Stripe
4. After payment, Stripe redirects back with success status
5. Webhook updates database, user gets unlimited access

### Project Counting
- Projects are tracked in `user_projects` table
- Count is automatically incremented via database function
- Limit checking happens before project creation
- Payment status determines access level

### Database Functions
- `can_create_project(user_uuid)`: Checks if user can create projects
- `create_project_with_limit()`: Creates project with automatic limit checking
- `update_payment_status()`: Updates user profile after payment
- `increment_project_count()`: Automatically increments project counter

## 🧪 Testing

### Test Page
Visit `/payment-test` to test the complete payment flow:

- Create projects to see count increment
- Test payment modal
- Verify database updates
- Check project limits

### Stripe Test Mode
- Use test card numbers: `4242 4242 4242 4242`
- Test webhook delivery with Stripe CLI
- Verify payment status updates

## 📱 Usage Examples

### Creating a Project
```typescript
import { useProjectManager } from '../hooks/useProjectManager';

const { createProject, projectCount, hasUnlimitedAccess } = useProjectManager();

const handleCreateProject = async () => {
  try {
    await createProject('My New Project', 'web-app');
    // Project created successfully
  } catch (error) {
    if (error.message.includes('Project limit reached')) {
      // Show payment modal
      setShowPaymentModal(true);
    }
  }
};
```

### Checking Payment Status
```typescript
const { hasUnlimitedAccess, projectCount } = useProjectManager();

if (hasUnlimitedAccess) {
  // User has paid, unlimited access
} else if (projectCount >= 3) {
  // User needs to upgrade
  setShowPaymentModal(true);
} else {
  // User can create more free projects
}
```

## 🔒 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Webhook Verification**: Stripe signature verification prevents spoofing
- **Database Functions**: Server-side validation of project limits
- **Authentication Required**: All payment operations require user auth

## 🚨 Troubleshooting

### Common Issues

1. **Webhook Not Working**
   - Check Stripe webhook endpoint URL
   - Verify webhook secret in environment
   - Check server logs for signature verification errors

2. **Project Count Not Updating**
   - Verify database functions are created
   - Check RLS policies are correct
   - Ensure user is authenticated

3. **Payment Modal Not Showing**
   - Check project count logic
   - Verify user authentication state
   - Check browser console for errors

### Debug Commands

```bash
# Check database functions
supabase db diff

# View table structure
supabase db dump --schema-only

# Test webhook locally
stripe listen --forward-to localhost:8000/api/stripe/webhook
```

## 🔮 Future Enhancements

- **Subscription Plans**: Monthly/yearly recurring payments
- **Usage Analytics**: Track project types and completion rates
- **Team Plans**: Multi-user collaboration features
- **Payment History**: User dashboard for payment records
- **Refund Handling**: Automated refund processing

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Stripe and Supabase documentation
3. Check server logs for detailed error messages
4. Verify all environment variables are set correctly

---

**Note**: This system is designed for production use but always test thoroughly in development first!
