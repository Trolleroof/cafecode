'use client';

import React, { useState } from 'react';
import { Bars3Icon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingButton, setLoadingButton] = useState<null | 'ide' | 'leet'>(null);
  const router = useRouter();

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    // Smooth scroll to section
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGoToIDE = () => {
    setLoadingButton('ide');
    setTimeout(() => {
      router.push('/ide');
    }, 900);
  };

  const handleGoToLeet = () => {
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
            <button
              onClick={handleGoToIDE}
              className="btn-coffee-primary px-6 py-2.5 text-lg shadow-lg hover:shadow-coffee flex items-center gap-2"
              disabled={loadingButton !== null}
            >
              {loadingButton === 'ide' ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Loading IDE...
                </>
              ) : (
                'Go to IDE'
              )}
            </button>
            <button
              onClick={handleGoToLeet}
              className="btn-coffee-secondary px-6 py-2.5 text-lg shadow-lg hover:shadow-coffee flex items-center gap-2"
              disabled={loadingButton !== null}
            >
              {loadingButton === 'leet' ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Loading Practice...
                </>
              ) : (
                'LeetCode Practice'
              )}
            </button>
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
            <button
              onClick={handleGoToIDE}
              className="btn-coffee-primary text-left text-lg py-2 flex items-center gap-2"
              disabled={loadingButton !== null}
            >
              {loadingButton === 'ide' ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Loading IDE...
                </>
              ) : (
                'Go to IDE'
              )}
            </button>
            <button
              onClick={handleGoToLeet}
              className="btn-coffee-secondary text-left text-lg py-2 flex items-center gap-2"
              disabled={loadingButton !== null}
            >
              {loadingButton === 'leet' ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Loading Practice...
                </>
              ) : (
                'LeetCode Practice'
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;