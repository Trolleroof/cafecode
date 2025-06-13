'use client';

import React, { useState } from 'react';
import { Menu, X, Code2, Github, Twitter } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleStartCoding = () => {
    router.push('/ide');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-3 rounded-xl shadow-lg">
              <Code2 className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">CodeCraft IDE</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-10">
            <a href="#features" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">Features</a>
            <a href="#how-it-works" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">How it Works</a>
            <a href="#pricing" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">Pricing</a>
            <a href="#about" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">About</a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-6">
            <button className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">
              Sign In
            </button>
            <button 
              onClick={handleStartCoding}
              className="btn-primary px-8 py-3 text-lg font-bold shadow-lg"
            >
              Start Coding
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-3 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/20">
            <nav className="flex flex-col space-y-6">
              <a href="#features" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">How it Works</a>
              <a href="#pricing" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">Pricing</a>
              <a href="#about" className="text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">About</a>
              <div className="flex flex-col space-y-4 pt-6 border-t border-gray-200">
                <button className="text-left text-gray-700 hover:text-primary-600 transition-colors font-semibold text-lg">
                  Sign In
                </button>
                <button 
                  onClick={handleStartCoding}
                  className="btn-primary px-8 py-3 text-lg font-bold shadow-lg"
                >
                  Start Coding
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;