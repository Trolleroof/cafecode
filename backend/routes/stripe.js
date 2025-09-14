import express from 'express';
import { StripeService } from '../services/StripeService.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Simple in-memory idempotency store for processed Stripe event IDs.
// Note: This is per-process and non-persistent. Consider a persistent store for multi-instance deployments.
const processedStripeEvents = new Set();

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
      const eventId = event?.id;
      const eventType = event?.type;
      if (!eventId) {
        console.error('[Stripe] Event missing id. Rejecting.');
        return res.status(400).json({ error: 'Invalid event: missing id' });
      }

      // Idempotency: skip already-processed events
      if (processedStripeEvents.has(eventId)) {
        console.log(`[Stripe] Duplicate event received. Skipping: ${eventType} (${eventId})`);
        return res.json({ received: true, idempotent: true });
      }

      console.log(`[Stripe] Processing event: ${eventType} (${eventId})`);

      // Handle the event
      switch (event.type) {
       
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = session.client_reference_id;
          console.log('[Stripe] checkout.session.completed details', {
            sessionId: session.id,
            userId,
            amount_total: session.amount_total,
            currency: session.currency,
            payment_status: session.payment_status,
          });

          // Validate required fields
          if (!userId) {
            console.error('[Stripe] Missing client_reference_id in session');
            return res.status(400).json({ error: 'Missing user reference' });
          }
          if (session.payment_status !== 'paid') {
            console.warn('[Stripe] Session completed but not paid:', session.payment_status);
            return res.status(400).json({ error: 'Payment not completed' });
          }
          // Optional: validate expected amount and currency
          if (typeof session.amount_total === 'number' && session.amount_total !== 1) {
            console.warn('[Stripe] Unexpected amount_total for session', session.amount_total);
          }
          if (session.currency && session.currency.toLowerCase() !== 'usd') {
            console.warn('[Stripe] Unexpected currency for session', session.currency);
          }
  

          // Primary path: RPC function updates profiles consistently
          let rpcSucceeded = false;
          try {
            const { error } = await supabase.rpc('grant_unlimited_access_by_id', {
              target_user: userId,
              stripe_session: session.id,
              amount_cents: session.amount_total,
            });
            if (error) {
              console.error('[Stripe] RPC grant_unlimited_access_by_id error:', error);
            } else {
              rpcSucceeded = true;
              console.log('[Stripe] RPC grant_unlimited_access_by_id succeeded');
            }
          } catch (err) {
            console.error('[Stripe] RPC call threw:', err);
          }

          // Fallback path: direct updates using service role
          let fallbackSucceeded = false;
          if (!rpcSucceeded && userId) {
            try {
              const updates = {
                has_unlimited_access: true,
                payment_status: 'paid',
                stripe_session_id: session.id,
                upgraded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              const { error: upErr } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);
              if (upErr) {
                console.error('[Stripe] Fallback profile update failed:', upErr);
              } else {
                console.log('[Stripe] Fallback profile update succeeded');
                fallbackSucceeded = true;
              }

              // Optional: record in payment_history if such a table exists
            } catch (err) {
              console.error('[Stripe] Fallback DB updates threw:', err);
            }
          }

          // If neither RPC nor fallback succeeded, signal failure so Stripe retries
          if (!rpcSucceeded && !fallbackSucceeded) {
            console.error('[Stripe] No DB path updated the user. Returning 500 to trigger retry.');
            return res.status(500).json({ error: 'Failed to persist payment' });
          }

          break;
        }
        
      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log('[Stripe] checkout.session.expired', { sessionId: session.id });
        // Optional: clean up any pending state in your DB if needed
        break;
      }
        
      case 'payment_intent.succeeded':
        {
          const paymentIntent = event.data.object;
          console.log('[Stripe] payment_intent.succeeded', {
            paymentIntentId: paymentIntent.id,
            amount_received: paymentIntent.amount_received,
            currency: paymentIntent.currency,
          });
          try {
            // If metadata contains userId, update profile as a fallback path
            const userId = paymentIntent.metadata?.userId;
            if (userId) {
              const amount = paymentIntent.amount_received || paymentIntent.amount || 0;
              const { error } = await supabase.rpc('grant_unlimited_access_by_id', {
                target_user: userId,
                stripe_session: paymentIntent.id, // fallback to PI id if no session id
                amount_cents: amount,
              });
              if (error) {
                console.error('[Stripe] DB grant via PI succeeded path failed:', error);
                return res.status(500).json({ error: 'Failed to persist PI payment' });
              } else {
                console.log('[Stripe] User access granted via PI succeeded');
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
                  const { error } = await supabase.rpc('grant_unlimited_access_by_id', {
                    target_user: found.client_reference_id,
                    stripe_session: found.id,
                    amount_cents: found.amount_total || paymentIntent.amount_received || 0,
                  });
                  if (error) {
                    console.error('[Stripe] DB grant via session lookup failed:', error);
                    return res.status(500).json({ error: 'Failed to persist PI->Session payment' });
                  }
                }
              } catch (e) {
                console.warn('[Stripe] Could not backfill user from PI -> Session lookup:', e.message);
              }
            }
          } catch (e) {
            console.error('[Stripe] PI succeeded handler error:', e);
            return res.status(500).json({ error: 'PI succeeded handler error' });
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        {
          const failedPayment = event.data.object;
          console.log('[Stripe] payment_intent.payment_failed', { paymentIntentId: failedPayment.id });
          try {
            const userId = failedPayment.metadata?.userId;
            if (userId) {
              await supabase
                .from('profiles')
                .update({ payment_status: 'unpaid', has_unlimited_access: false, updated_at: new Date().toISOString() })
                .eq('id', userId);
            }
          } catch (e) {
            console.warn('[Stripe] payment_intent.payment_failed handler error:', e.message);
          }
        }
        break;
        
      case 'payment_intent.canceled':
        {
          const canceled = event.data.object;
          console.log('[Stripe] payment_intent.canceled', { paymentIntentId: canceled.id });
          try {
            const userId = canceled.metadata?.userId;
            if (userId) {
              await supabase
                .from('profiles')
                .update({ payment_status: 'unpaid', updated_at: new Date().toISOString() })
                .eq('id', userId);
            }
          } catch (e) {
            console.warn('[Stripe] payment_intent.canceled handler error:', e.message);
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed (best-effort). Note: process memory scoped.
    try {
      processedStripeEvents.add(eventId);
      // Optional: cap the size to avoid unbounded growth
      if (processedStripeEvents.size > 1000) {
        // Clear all as a simple cap strategy (replace with LRU in persistent store if needed)
        processedStripeEvents.clear();
      }
    } catch (_) {}

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
