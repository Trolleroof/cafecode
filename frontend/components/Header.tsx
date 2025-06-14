'use client';

import React, { useState } from 'react';
import { Menu, X, Code2 } from 'lucide-react';
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-2.5 lg:p-3 rounded-xl shadow-lg">
              <Code2 className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-gray-900 hidden sm:block">
              CodeCraft IDE
            </span>
            <span className="text-lg font-bold text-gray-900 sm:hidden">
              CodeCraft
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <button 
              onClick={() => handleNavClick('#features')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg"
            >
              Features
            </button>
            <button 
              onClick={() => handleNavClick('#how-it-works')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg"
            >
              How it Works
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg"
            >
              Pricing
            </button>
            <button 
              onClick={() => handleNavClick('#about')}
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg"
            >
              About
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <button className="text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg">
              Sign In
            </button>
            <button 
              onClick={handleStartCoding}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Coding
            </button>
          </div>

          {/* Mobile CTA Button */}
          <div className="flex lg:hidden items-center space-x-3">
            <button 
              onClick={handleStartCoding}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300"
            >
              Start Coding
            </button>
            
            {/* Mobile menu button */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-700" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700" />
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
          <nav className="flex flex-col space-y-4 pt-4 border-t border-gray-200">
            <button 
              onClick={() => handleNavClick('#features')}
              className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg py-2"
            >
              Features
            </button>
            <button 
              onClick={() => handleNavClick('#how-it-works')}
              className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg py-2"
            >
              How it Works
            </button>
            <button 
              onClick={() => handleNavClick('#pricing')}
              className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg py-2"
            >
              Pricing
            </button>
            <button 
              onClick={() => handleNavClick('#about')}
              className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg py-2"
            >
              About
            </button>
            <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
              <button className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium text-lg py-2">
                Sign In
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;