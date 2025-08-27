import express from 'express';
import { StripeService } from '../services/StripeService.js';

const router = express.Router();

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
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
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
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`Payment completed for session: ${session.id}`);
        console.log(`User ID: ${session.client_reference_id}`);
        console.log(`Amount: ${session.amount_total} cents`);
        
        // TODO: Update your database to mark this user as paid
        // You'll implement this in the next step
        
        break;
        
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
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
