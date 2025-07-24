'use client';

import React, { useState, useEffect } from 'react';
import { Bars3Icon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingButton, setLoadingButton] = useState<null | 'ide' | 'leet'>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [loadingBrewing, setLoadingBrewing] = useState(false);
  // Removed: showAuthModal, authLoading, authError, authEmail, authPassword, pendingRoute

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // On route change, if the new route is /login, stop the loading animation.
    if (pathname === '/login') {
      setLoadingBrewing(false);
    }
  }, [pathname]);

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };
  const handleGoToIDE = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    setLoadingButton('ide');
    setTimeout(() => {
      router.push('/ide');
    }, 900);
  };
  const handleGoToLeet = () => {
    if (!session) {
      router.push('/login');
      return;
    }
    setLoadingButton('leet');
    setTimeout(() => {
      router.push('/leetcode');
    }, 900);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 coffee-nav shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Coffee Shop Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}> 
            <div className="animate-warm-glow">
              <img src="/images/logo.png" alt="Cafécode Logo" className="h-8 w-8 lg:h-10 lg:w-10 object-contain rounded-xl" />
            </div>
            <span className="font-heading text-xl lg:text-2xl font-bold text-light-cream hidden sm:block">
              Cafécode
            </span>
            <span className="font-heading text-lg font-bold text-light-cream sm:hidden">
            Cafécode
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => handleNavClick('#how-it-works')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              How It Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#features')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              Our Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#problemStatement')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              The Truth
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              Menu
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            {session ? (
              <>
                <span className="text-cream-beige text-sm mr-2">{session.user.email}</span>
                <button onClick={handleSignOut} className="btn-coffee-secondary px-4 py-2 text-sm">Sign Out</button>
              </>
            ) : (
              <button
                onClick={() => {
                  setLoadingBrewing(true);
                  router.push('/login');
                }}
                className="btn-coffee-primary px-6 py-2.5 text-lg shadow-lg hover:shadow-coffee flex items-center gap-2"
                disabled={loadingBrewing}
              >
                {loadingBrewing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Start Brewing'
                )}
              </button>
            )}
          </div>

          {/* Mobile CTA Button & User Menu */}
          <div className="flex lg:hidden items-center space-x-3">
            {/* Mobile menu button */}
            <button
              className="p-2 rounded-lg hover:bg-medium-coffee/20 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6 text-cream-beige" />
              ) : (
                <Bars3Icon className="h-6 w-6 text-cream-beige" />
              )}
            </button>
            {session ? (
              <>
                <span className="text-cream-beige text-xs mr-2">{session.user.email}</span>
                <button onClick={handleSignOut} className="btn-coffee-secondary px-3 py-1 text-xs">Sign Out</button>
              </>
            ) : (
              <button
                onClick={() => {
                  setLoadingBrewing(true);
                  router.push('/login');
                }}
                className="btn-coffee-primary px-4 py-2 text-xs shadow-lg hover:shadow-coffee flex items-center gap-2"
                disabled={loadingBrewing}
              >
                {loadingBrewing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Start Brewing'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`lg:hidden transition-all duration-300 ease-in-out ${
          isMenuOpen 
            ? 'max-h-96 opacity-100 pb-6' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <nav className="flex flex-col space-y-4 pt-4 border-t border-medium-coffee/30">
            <button 
              onClick={() => handleNavClick('#how-it-works')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              How It Works
            </button>
            <button 
              onClick={() => handleNavClick('#features')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              Our Features
            </button>
            <button 
              onClick={() => handleNavClick('#problemStatement')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              The Truth
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              Menu
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;