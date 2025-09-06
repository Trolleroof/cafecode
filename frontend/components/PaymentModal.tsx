'use client';

import React, { useState } from 'react';
import { IconCreditCard, IconLock, IconRefresh, IconX, IconStar } from '@tabler/icons-react';
import { supabase } from '../lib/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectCount: number;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, projectCount, onPaymentSuccess }: PaymentModalProps) {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    setPaymentLoading(true);
    setError('');
    
    try {
      // Get current user from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Please log in!');
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-gradient-to-br from-light-cream via-cream-beige to-light-cream rounded-2xl shadow-2xl p-6 w-full max-w-md relative mt-16 mb-8 overflow-hidden">
        <button
          className="absolute top-3 right-3 text-dark-charcoal hover:text-medium-coffee transition-colors bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md"
          onClick={onClose}
          aria-label="Close"
        >
          <IconX className="h-4 w-4" />
        </button>
        
        <div className="text-center">
          <div className="bg-gradient-to-r from-medium-coffee to-deep-espresso p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
            <IconLock className="h-8 w-8 text-light-cream" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-dark-charcoal font-heading">
            Unlock Unlimited Projects
          </h2>
          
          <p className="text-deep-espresso mb-6 text-base">
                            You've used <span className="font-bold text-medium-coffee">{projectCount}</span> out of 3 free projects.
          </p>
          
          <div className="mb-6">
            <h3 className="font-bold text-dark-charcoal mb-3 text-xl">What you get:</h3>
            <ul className="text-left text-deep-espresso space-y-2 text-base">
              <li className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                Unlimited project creation
              </li>
              <li className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                Advanced AI features
              </li>
              <li className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                Priority support
              </li>
              <li className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                Code templates & libraries
              </li>
              <li className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                Progress tracking
              </li>
            </ul>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            className="w-full bg-gradient-to-r from-medium-coffee via-deep-espresso to-medium-coffee hover:from-deep-espresso hover:to-medium-coffee text-light-cream py-6 text-lg font-bold rounded-xl flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 mb-4"
          >
            {paymentLoading ? (
              <>
                <IconRefresh className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <div className="text-4xl font-bold mb-1">$4.99</div>
                <div className="flex items-center gap-2 text-lg">
                  <IconCreditCard className="h-5 w-5" />
                  Upgrade Now
                </div>
                <div className="text-sm opacity-95 mb-2">One-time payment • No recurring charges • Unlimited Access</div>
  
              </>
            )}
          </button>
          
          <p className="text-xs text-deep-espresso mt-4 opacity-80">
            Secure payment powered by Stripe • 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
}
