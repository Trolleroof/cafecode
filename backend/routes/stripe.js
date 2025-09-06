import express from 'express';
import { StripeService } from '../services/StripeService.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client (use service role for server-side updates)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Stripe Routes] Supabase environment missing:', {
    supabaseUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * @route POST /api/stripe/checkout
 * @desc Creates a Stripe checkout session
 * @access Private (user must be authenticated)
 */
router.post('/checkout', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing userId',
        message: 'User ID is required to create checkout session' 
      });
    }

    console.log(`Creating checkout session for user: ${userId}`);

    // Create the checkout session
    const session = await StripeService.createCheckoutSession(userId);
    
    // Return the checkout URL
    res.json({ 
      success: true,
      url: session.url, // This is the Stripe checkout page URL
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Checkout endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

/**
 * @route GET /api/stripe/session/:sessionId
 * @desc Gets details of a checkout session
 * @access Private
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await StripeService.getSessionDetails(sessionId);
    
    res.json({ 
      success: true,
      session 
    });
    
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve session',
      message: error.message 
    });
  }
});

/**
 * @route POST /api/stripe/webhook
 * @desc Handles Stripe webhook events
 * @access Public (Stripe calls this)
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe signature' });
  }

  let event;

  try {
    event = StripeService.constructWebhookEvent(req.body, sig);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
          // Handle the event
      switch (event.type) {
        case 'payment_intent.created': {
          const pi = event.data.object;
          console.log(`[Stripe] payment_intent.created: ${pi.id}`);
          if (pi.metadata?.userId) {
            console.log(`[Stripe] PI created for user: ${pi.metadata.userId}`);
          }
          break;
        }
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log(`Payment completed for session: ${session.id}`);
          console.log(`User ID: ${session.client_reference_id}`);
          console.log(`Amount: ${session.amount_total} cents`);
          
          // Update user profile in database using the new function
          try {
            // Call the database function to update payment status
            const { error } = await supabase.rpc('update_payment_status', {
              user_uuid: session.client_reference_id,
              stripe_session: session.id,
              payment_status: 'paid',
              amount_cents: session.amount_total
            });
            
            if (error) {
              console.error('Database update error:', error);
            } else {
              console.log('User payment status updated successfully');
            }
          } catch (error) {
            console.error('Error updating user payment status:', error);
          }
          
          break;
        
      case 'payment_intent.succeeded':
        {
          const paymentIntent = event.data.object;
          console.log(`Payment succeeded: ${paymentIntent.id}`);
          try {
            // If metadata contains userId, update profile as a fallback path
            const userId = paymentIntent.metadata?.userId;
            if (userId) {
              const amount = paymentIntent.amount_received || paymentIntent.amount || 0;
              const { error } = await supabase.rpc('update_payment_status', {
                user_uuid: userId,
                stripe_session: paymentIntent.id, // fallback to PI id if no session id
                payment_status: 'paid',
                amount_cents: amount
              });
              if (error) {
                console.error('[Stripe] DB update on PI succeeded failed:', error);
              } else {
                console.log('[Stripe] User payment status updated via PI succeeded');
              }
            } else {
              // Attempt to locate Checkout Session to extract client_reference_id
              try {
                const stripeKey = process.env.STRIPE_SECRET_KEY;
                const Stripe = (await import('stripe')).default;
                const stripe = new Stripe(stripeKey);
                const list = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 });
                const found = list?.data?.[0];
                if (found?.client_reference_id) {
                  const { error } = await supabase.rpc('update_payment_status', {
                    user_uuid: found.client_reference_id,
                    stripe_session: found.id,
                    payment_status: 'paid',
                    amount_cents: found.amount_total || paymentIntent.amount_received || 0
                  });
                  if (error) console.error('[Stripe] DB update via session lookup failed:', error);
                }
              } catch (e) {
                console.warn('[Stripe] Could not backfill user from PI -> Session lookup:', e.message);
              }
            }
          } catch (e) {
            console.error('[Stripe] PI succeeded handler error:', e);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log(`Payment failed: ${failedPayment.id}`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
