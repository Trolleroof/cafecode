'use client';

import React, { useState, useEffect } from 'react';
import { Bars3Icon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { IconCode } from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useProjectManager } from '../hooks/useProjectManager';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingButton, setLoadingButton] = useState<null | 'ide'>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [loadingBrewing, setLoadingBrewing] = useState(false);
  const { projectCount, hasUnlimitedAccess } = useProjectManager();
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 coffee-nav shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 lg:h-14">
          {/* Coffee Shop Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => router.push('/')}> 
            <div className="animate-warm-glow">
              <img src="/images/logo.png" alt="Cafécode Logo" className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 object-contain rounded-xl" />
            </div>
            <span className="font-heading text-base sm:text-lg lg:text-xl font-bold text-white hidden sm:block">
              Cafécode
            </span>
            <span className="font-heading text-sm font-bold text-white sm:hidden">
            Cafécode
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <button 
              onClick={() => handleNavClick('#how-it-works')}
              className="font-body text-white/90 hover:text-white transition-colors font-medium text-base xl:text-lg relative group"
            >
              How It Works
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#features')}
              className="font-body text-white/90 hover:text-white transition-colors font-medium text-base xl:text-lg relative group"
            >
              Our Features
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#problemStatement')}
              className="font-body text-white/90 hover:text-white transition-colors font-medium text-base xl:text-lg relative group"
            >
              The Truth
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="font-body text-white/90 hover:text-white transition-colors font-medium text-base xl:text-lg relative group"
            >
              Menu
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-3 xl:space-x-4">
            {session ? (
              <>
                {/* Small project counter for paid users */}
                {hasUnlimitedAccess && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                    <IconCode className="h-4 w-4 text-white/80" />
                    <span className="text-white/90 text-sm font-medium">
                      {projectCount} projects
                    </span>
                  </div>
                )}
                <button 
                  onClick={handleGoToIDE}
                  className="px-6 py-2 text-base shadow-lg rounded-xl flex items-center gap-2 font-medium -ml-4 bg-cream-beige text-deep-espresso border border-medium-coffee/30 hover:bg-medium-coffee hover:text-white transition-colors duration-200"
                  disabled={loadingButton === 'ide'}
                >
                  {loadingButton === 'ide' ? (
                    <>
                      <div className="spinner-coffee h-4 w-4"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <IconCode className="h-4 w-4" />
                      Start Coding
                    </>
                  )}
                </button>
                <div className="relative group">
                  <span className="text-white/90 text-sm cursor-pointer hover:text-white transition-colors">
                    {session.user.email}
                  </span>
                  {/* Dropdown */}
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  setLoadingBrewing(true);
                  router.push('/login');
                }}
                className="btn-navbar-cta px-5 py-2 text-base shadow-lg flex items-center gap-2"
                disabled={loadingBrewing}
              >
                {loadingBrewing ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Start Coding'
                )}
              </button>
            )}
          </div>

          {/* Mobile CTA Button & User Menu */}
          <div className="flex lg:hidden items-center space-x-3">
            {/* Mobile project counter for paid users */}
            {session && hasUnlimitedAccess && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <IconCode className="h-3 w-3 text-white/80" />
                <span className="text-white/90 text-xs font-medium">
                  {projectCount}
                </span>
              </div>
            )}
            {/* Mobile Start Coding Button */}
            {session && (
              <button 
                onClick={handleGoToIDE}
                className="px-4 py-2 text-xs shadow-lg rounded-xl flex items-center gap-2 font-medium bg-cream-beige text-deep-espresso border border-medium-coffee/30 hover:bg-medium-coffee hover:text-white transition-colors duration-200"
                disabled={loadingButton === 'ide'}
              >
                {loadingButton === 'ide' ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <IconCode className="h-3 w-3" />
                    Start Coding
                  </>
                )}
              </button>
            )}
            {/* Mobile menu button */}
            <button
              className="p-2 rounded-lg hover:bg-medium-coffee/20 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6 text-white/90" />
              ) : (
                <Bars3Icon className="h-6 w-6 text-white/90" />
              )}
            </button>
            {session ? (
              <>
                <span className="text-white/90 text-xs mr-2">{session.user.email}</span>
                <button onClick={handleSignOut} className="btn-coffee-secondary px-3 py-1 text-xs">Sign Out</button>
              </>
            ) : (
              <button
                onClick={() => {
                  setLoadingBrewing(true);
                  router.push('/login');
                }}
                className="btn-navbar-cta px-4 py-2 text-xs shadow-lg flex items-center gap-2"
                disabled={loadingBrewing}
              >
                {loadingBrewing ? (
                  <>
                    <div className="spinner-coffee h-5 w-5"></div>
                    Loading...
                  </>
                ) : (
                  'Start Coding'
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
              className="font-body text-left text-white/90 hover:text-white transition-colors font-medium text-lg py-2"
            >
              How It Works
            </button>
            <button 
              onClick={() => handleNavClick('#features')}
              className="font-body text-left text-white/90 hover:text-white transition-colors font-medium text-lg py-2"
            >
              Our Features
            </button>
            <button 
              onClick={() => handleNavClick('#problemStatement')}
              className="font-body text-left text-white/90 hover:text-white transition-colors font-medium text-lg py-2"
            >
              The Truth
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="font-body text-left text-white/90 hover:text-white transition-colors font-medium text-lg py-2"
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
