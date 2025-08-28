'use client';

import React, { useState } from 'react';
import { IconCreditCard, IconLock, IconRefresh, IconArrowRight, IconStar } from '@tabler/icons-react';

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
      const { data: { user } } = await import('../lib/supabase').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
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
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-light-cream rounded-lg shadow-lg p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-dark-charcoal hover:text-medium-coffee transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <IconArrowRight className="h-6 w-6" />
        </button>
        
        <div className="text-center">
          <IconLock className="h-16 w-16 text-medium-coffee mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-medium-coffee font-heading">
            Unlock Unlimited Projects
          </h2>
          
          <p className="text-deep-espresso mb-6 text-lg">
            You've used <span className="font-semibold text-medium-coffee">{projectCount}</span> out of 3 free projects.
          </p>
          
          <div className="bg-medium-coffee/10 p-6 rounded-lg mb-6 border border-medium-coffee/20">
            <h3 className="font-semibold text-medium-coffee mb-3 text-lg">What you get:</h3>
            <ul className="text-left text-deep-espresso space-y-2">
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
          
          <div className="bg-gradient-to-r from-medium-coffee to-deep-espresso p-4 rounded-lg mb-6 text-white">
            <div className="text-3xl font-bold mb-1">$19.99</div>
            <div className="text-sm opacity-90">One-time payment • No recurring charges</div>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <button
            onClick={handlePayment}
            disabled={paymentLoading}
            className="w-full btn-coffee-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {paymentLoading ? (
              <>
                <IconRefresh className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <IconCreditCard className="h-5 w-5" />
                Upgrade Now
              </>
            )}
          </button>
          
          <p className="text-sm text-deep-espresso mt-4">
            Secure payment powered by Stripe • 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
}
