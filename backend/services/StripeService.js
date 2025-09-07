import Stripe from 'stripe';

export class StripeService {
  /**
   * Creates a Stripe checkout session for one-time payment
   * @param {string} userId - The user's ID from your database
   * @returns {Promise<Object>} Stripe checkout session
   */
  static async createCheckoutSession(userId) {
    try {
      // Initialize Stripe inside the method to ensure env vars are loaded
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key || typeof key !== 'string') {
        throw new Error('STRIPE_SECRET_KEY is missing');
      }
      if (!key.startsWith('sk_')) {
        throw new Error('STRIPE_SECRET_KEY does not look like a Stripe secret key');
      }
      const masked = `${key.slice(0, 7)}…${key.slice(-4)}`;
      console.log(`Stripe key detected: ${masked}`);
      const stripe = new Stripe(key);
      
      console.log(`Creating checkout session for user: ${userId}`);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Unlimited Projects Access',
              description: 'One-time payment to unlock unlimited project creation on Cafécode',
              images: ['https://trycafecode.xyz/logo.png'], // Your logo URL
            },
            unit_amount: 499, // $19.99 in cents (Stripe uses cents)
          },
          quantity: 1,
        }],
        mode: 'payment', // One-time payment (not subscription)
        // Include payment status flag so frontend can detect successful return
        // success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        // cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ide?payment=canceled`,

        //GLOBAL VERSION
        success_url: 'http://trycafecode.xyz/payment-success?payment=success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://trycafecode.xyz/ide?payment=canceled',
        
        client_reference_id: userId, // This helps you track which user made the payment
        metadata: {
          userId: userId, // Additional metadata for tracking
        },
        // Ensure downstream PaymentIntent also contains the userId for webhook fallbacks
        payment_intent_data: {
          metadata: { userId }
        },
        // Optional: customize the checkout page
        billing_address_collection: 'auto',
        // customer_email: 'user@example.com', // You can get this from your user data later
      });
      
      console.log(`Checkout session created: ${session.id}`);
      return session;
      
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Verifies if a payment was successful
   * @param {string} paymentIntentId - The payment intent ID from Stripe
   * @returns {Promise<boolean>} True if payment was successful
   */
  static async verifyPayment(paymentIntentId) {
    try {
      // Initialize Stripe inside the method to ensure env vars are loaded
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status === 'succeeded';
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  }

  /**
   * Gets payment details for a checkout session
   * @param {string} sessionId - The checkout session ID
   * @returns {Promise<Object>} Session details
   */
  static async getSessionDetails(sessionId) {
    try {
      // Initialize Stripe inside the method to ensure env vars are loaded
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error('Error retrieving session:', error);
      throw error;
    }
  }

  /**
   * Constructs webhook event from request body and signature
   * @param {Buffer} body - Raw request body
   * @param {string} signature - Stripe signature header
   * @returns {Object} Webhook event
   */
  static constructWebhookEvent(body, signature) {
    try {
      // Initialize Stripe and verify required env vars
      const key = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
      if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
      const stripe = new Stripe(key);

      const isBuffer = Buffer.isBuffer(body);
      if (!isBuffer) {
        console.warn('[Stripe] Webhook body is not a Buffer. Type:', typeof body);
      }
      // Prefer raw string per Stripe docs (Buffer is also accepted)
      const payload = isBuffer ? body.toString('utf8') : body;

      return stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      throw new Error('Webhook signature verification failed');
    }
  }
}
