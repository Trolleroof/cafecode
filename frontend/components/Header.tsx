'use client';

import React, { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleStartCoding = () => {
    router.push('/ide');
  };

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    // Smooth scroll to section
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 coffee-nav shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Coffee Shop Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="bg-gradient-to-r from-medium-coffee to-deep-espresso p-2.5 lg:p-3 rounded-xl shadow-coffee animate-warm-glow">
              <span className="text-light-cream text-xl lg:text-2xl">☕</span>
            </div>
            <span className="font-heading text-xl lg:text-2xl font-bold text-light-cream hidden sm:block">
              CodeCraft Café
            </span>
            <span className="font-heading text-lg font-bold text-light-cream sm:hidden">
              CodeCraft
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => handleNavClick('#features')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              Our Blend
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#how-it-works')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              Brewing Process
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              Menu
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
            <button 
              onClick={() => handleNavClick('#about')}
              className="font-body text-cream-beige hover:text-light-cream transition-colors font-medium text-lg relative group"
            >
              About Us
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-medium-coffee transition-all duration-300 group-hover:w-full"></span>
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <button 
              onClick={handleStartCoding}
              className="btn-coffee-primary px-6 py-2.5 text-lg shadow-lg hover:shadow-coffee"
            >
              Start Brewing
            </button>
          </div>

          {/* Mobile CTA Button */}
          <div className="flex lg:hidden items-center space-x-3">
            <button 
              onClick={handleStartCoding}
              className="btn-coffee-primary px-4 py-2 text-sm shadow-md hover:shadow-coffee"
            >
              Start Brewing
            </button>
            
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
              onClick={() => handleNavClick('#features')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              Our Blend
            </button>
            <button 
              onClick={() => handleNavClick('#how-it-works')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              Brewing Process
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              Menu
            </button>
            <button 
              onClick={() => handleNavClick('#about')}
              className="font-body text-left text-cream-beige hover:text-light-cream transition-colors font-medium text-lg py-2"
            >
              About Us
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;