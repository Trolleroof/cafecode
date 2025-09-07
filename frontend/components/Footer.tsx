import React from 'react';
import { GlobeAltIcon, ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-dark-charcoal text-light-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Coffee Shop Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-gradient-to-r from-medium-coffee to-deep-espresso p-2 rounded-lg animate-warm-glow">
                <span className="text-light-cream text-xl">☕</span>
              </div>
              <span className="font-heading text-xl font-bold">Cafécode</span>
            </div>
            <p className="font-body text-cream-beige mb-6 max-w-md">
              Brewing the perfect coding experience for the next generation of developers. 
              Where every line of code is crafted with the same care as your morning coffee.
            </p>
            <div className="flex space-x-4">
              <Link href="/" className="text-cream-beige hover:text-medium-coffee transition-colors">
                <GlobeAltIcon className="h-6 w-6" />
              </Link>
              <Link href="/#how-it-works" className="text-cream-beige hover:text-medium-coffee transition-colors">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </Link>
              
              <a href="mailto:nikhil@soloscalesolutions.dev" className="text-cream-beige hover:text-medium-coffee transition-colors">
                <EnvelopeIcon className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Our Blend */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-6 text-medium-coffee">Our Blend</h3>
            <ul className="space-y-4">
              <li><Link href="/#features" className="text-cream-beige hover:text-light-cream transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-cream-beige hover:text-light-cream transition-colors">Menu & Pricing</Link></li>
              <li><Link href="/ide" className="text-cream-beige hover:text-light-cream transition-colors">Code Editor</Link></li>
            </ul>
          </div>

          {/* Café Support */}
          <div>
            <h3 className="font-heading text-lg font-semibold mb-6 text-medium-coffee">Café Support</h3>
            <ul className="space-y-4">
              <li><Link href="/#how-it-works" className="text-cream-beige hover:text-light-cream transition-colors">How It Works</Link></li>
              <li><Link href="/#problemStatement" className="text-cream-beige hover:text-light-cream transition-colors">The Truth</Link></li>
              <li><Link href="/#pricing" className="text-cream-beige hover:text-light-cream transition-colors">Pricing</Link></li>
              <li><Link href="/login" className="text-cream-beige hover:text-light-cream transition-colors">Login</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-deep-espresso mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="font-body text-cream-beige text-sm">
            © 2025 Cafécode. All rights reserved. Brewed with ❤️ for developers.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/#features" className="text-cream-beige hover:text-light-cream text-sm transition-colors">Features</Link>
            <Link href="/#pricing" className="text-cream-beige hover:text-light-cream text-sm transition-colors">Menu</Link>
            <Link href="/ide" className="text-cream-beige hover:text-light-cream text-sm transition-colors">Start Coding</Link>
            <Link href="/login" className="text-cream-beige hover:text-light-cream text-sm transition-colors">Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
