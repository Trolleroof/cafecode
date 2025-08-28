'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconCheck, IconX, IconRefresh } from '@tabler/icons-react';
import { supabase } from '../lib/supabase';

export default function PaymentSuccessHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      handlePaymentSuccess(sessionId);
    } else if (paymentStatus === 'canceled') {
      setStatus('error');
      setMessage('Payment was canceled. You can try again anytime.');
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      // Verify the payment with your backend
      const response = await fetch(`/api/stripe/session/${sessionId}`);
      const data = await response.json();

      if (data.success && data.session.payment_status === 'paid') {
        // Nothing to write from client: webhook updates profiles + payment_history
        // Optionally, we could refetch the profile to confirm status if needed

        setStatus('success');
        setMessage('Payment successful! You now have unlimited access to all features.');
        
        // Redirect to IDE after 3 seconds
        setTimeout(() => {
          router.push('/ide');
        }, 3000);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage('There was an issue verifying your payment. Please contact support.');
    }
  };

  const handleRetry = () => {
    router.push('/ide');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-light-cream flex items-center justify-center">
        <div className="text-center">
          <IconRefresh className="h-16 w-16 text-medium-coffee mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-medium-coffee mb-2">Verifying Payment</h2>
          <p className="text-deep-espresso">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-cream flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
        {status === 'success' ? (
          <>
            <IconCheck className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-medium-coffee mb-4">Payment Successful!</h2>
            <p className="text-deep-espresso mb-6">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">What's Next?</h3>
              <ul className="text-left text-green-700 space-y-1 text-sm">
                <li>• Create unlimited projects</li>
                <li>• Access advanced AI features</li>
                <li>• Get priority support</li>
                <li>• Use code templates</li>
              </ul>
            </div>
            <button
              onClick={handleRetry}
              className="w-full btn-coffee-primary py-3 text-lg"
            >
              Start Coding Now
            </button>
          </>
        ) : (
          <>
            <IconX className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-medium-coffee mb-4">Payment Issue</h2>
            <p className="text-deep-espresso mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full btn-coffee-secondary py-3 text-lg"
              >
                Try Again
              </button>
              <button
                onClick={handleGoHome}
                className="w-full text-medium-coffee py-2 hover:underline"
              >
                Go Back Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
