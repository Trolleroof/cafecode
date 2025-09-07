'use client';

import React, { useState, useEffect } from 'react';
import { IconCheck, IconHome, IconCreditCard, IconStar, IconRocket, IconBug } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [countdown, setCountdown] = useState(5);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Verify payment session if sessionId exists
    if (sessionId) {
      verifyPaymentSession(sessionId);
    }

    return () => clearInterval(timer);
  }, [sessionId, router]);

  const verifyPaymentSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/stripe/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentDetails(data);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRedirect = () => {
    router.push('/');
  };

  const handleDebugStripeSuccess = () => {
    // Navigate to payment success with a mock session ID for testing
    router.push('/payment-success?session_id=cs_test_debug_session_12345');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-cream-beige to-light-coffee flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
        {/* Debug Button - Only show in development */}
        
    

        {/* Success Animation Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-50"></div>
        
        {/* Success Icon */}
        <div className="relative z-10">
          <div className="bg-green-500 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg">
            <IconCheck className="h-10 w-10 text-white" />
          </div>
          
          {/* Main Success Message */}
          <h1 className="text-3xl font-bold text-dark-charcoal mb-4 font-heading">
            Payment Successful! 🎉
          </h1>
          
          <p className="text-deep-espresso mb-6 text-lg">
            Welcome to unlimited projects on Cafécode!
          </p>

          {/* Payment Details */}
          <div className="bg-light-cream rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-dark-charcoal mb-3 flex items-center gap-2">
              <IconCreditCard className="h-5 w-5 text-medium-coffee" />
              Payment Details
            </h3>
            <div className="space-y-2 text-sm text-deep-espresso">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-semibold">$4.99</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-semibold">
                  {(() => {
                    try {
                      if (paymentDetails?.created && typeof paymentDetails.created === 'number') {
                        return new Date(paymentDetails.created * 1000).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                      }
                      return new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    } catch (error) {
                      return new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    }
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-600 font-semibold">✓ Paid</span>
              </div>
            </div>
          </div>

          {/* What You Get */}
          <div className="bg-gradient-to-r from-medium-coffee to-deep-espresso rounded-xl p-4 mb-6 text-white">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <IconStar className="h-5 w-5 text-yellow-300" />
              What You Get Now
            </h3>
            <ul className="text-left space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <IconRocket className="h-4 w-4 text-yellow-300" />
                Unlimited project creation
              </li>
              <li className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-yellow-300" />
                Advanced AI features
              </li>
              <li className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-yellow-300" />
                Priority support
              </li>
            </ul>
          </div>

          {/* Auto-redirect Countdown */}
          <div className="mb-6">
            <p className="text-deep-espresso mb-3">
              Redirecting to homepage in <span className="font-bold text-medium-coffee">{countdown}</span> seconds...
            </p>
            <div className="w-full bg-light-coffee rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-medium-coffee to-deep-espresso h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((30 - countdown) / 30) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Manual Redirect Button */}
          <button
            onClick={handleManualRedirect}
            className="btn-coffee-primary w-full py-3 text-lg font-semibold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
          >
            <IconHome className="h-5 w-5" />
            Go to Homepage Now
          </button>
        </div>
      </div>
    </div>
  );
}
