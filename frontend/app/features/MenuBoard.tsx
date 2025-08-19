'use client';

import React, { useState } from 'react';
import MenuItemCard from './MenuItemCard';
import FeatureDemoModal from './FeatureDemoModal';
import {
  IconCoffee,
  IconTool,
  IconBulb,
  IconWindow,
  IconMessage,
  IconTrophy,
  IconBook
} from '@tabler/icons-react';
import Image from 'next/image';
import './animations.css';

const features = [
  {
    icon: <IconCoffee />,
    title: 'Brewster AI Assistant',
    price: '☕ Premium Blend',
    tags: ['Code Analysis', 'AI Chat', '24/7 Available', 'Context Aware'],
    description: (
      <div>
        <p className="mb-2">Your personal coding companion that understands your style and provides intelligent suggestions.</p>
        <ul className="text-sm opacity-80 space-y-1">
          <li>• Explains complex code patterns</li>
          <li>• Suggests optimizations</li>
          <li>• Helps debug issues</li>
        </ul>
      </div>
    ),
    color: '#a36a3e',
    demoAction: 'Try AI Chat',
  },
  {
    icon: <IconTool />,
    title: 'Smart Code Fixes',
    price: '⚡ Express Service',
    tags: ['Auto Fix', 'Smart Hints', 'Learn Why', 'Real-time'],
    description: (
      <div>
        <p className="mb-2">Intelligent code analysis that catches errors before they become problems.</p>
        <ul className="text-sm opacity-80 space-y-1">
          <li>• Real-time error detection</li>
          <li>• One-click fixes</li>
          <li>• Educational explanations</li>
        </ul>
      </div>
    ),
    color: '#814d33',
    demoAction: 'See Demo',
  },
  {
    icon: <IconWindow />,
    title: 'Instant Code Runner',
    price: '🚀 Zero Setup',
    tags: ['No Install', 'Instant Run', 'All Languages', 'Cloud Powered'],
    description: (
      <div>
        <p className="mb-2">Execute code instantly in a fully-featured browser environment.</p>
        <ul className="text-sm opacity-80 space-y-1">
          <li>• Support for 20+ languages</li>
          <li>• Package management included</li>
          <li>• Share projects instantly</li>
        </ul>
      </div>
    ),
    color: '#6f4e37',
    demoAction: 'Run Code',
  },
  {
    icon: <IconMessage />,
    title: 'Gabby Virtual Mentor',
    price: '💝 Comfort Blend',
    tags: ['Project Support', 'Motivation', 'Career Guidance', 'Community'],
    description: (
      <div>
        <p className="mb-2">More than just a chatbot - your coding journey companion and career mentor.</p>
        <ul className="text-sm opacity-80 space-y-1">
          <li>• Personalized learning paths</li>
          <li>• Interview preparation</li>
          <li>• Portfolio reviews</li>
        </ul>
      </div>
    ),
    color: '#e7c08a',
    demoAction: 'Chat Now',
  },
  {
    icon: <IconBook />,
    title: 'Guided Learning Tasks',
    price: '📚 Master Path',
    tags: ['Step-by-Step', 'Real Applications', 'Portfolio Ready', 'Industry Standards', 'Certification'],
    description: (
      <div>
        <p className="mb-2">Build real-world applications with expert guidance and industry best practices.</p>
        <ul className="text-sm opacity-80 space-y-1">
          <li>• 50+ curated coding tasks</li>
          <li>• From beginner to advanced</li>
          <li>• GitHub integration</li>
          <li>• Completion certificates</li>
        </ul>
      </div>
    ),
    color: '#8b4513',
    featured: true,
            demoAction: 'Start Coding Task',
  },
  {
    icon: <IconTrophy />,
    title: 'Skill Challenges',
    price: '🏆 Competition Mode',
    tags: ['Daily Challenges', 'Leaderboards', 'Skill Tracking', 'Achievements'],
    description: (
      <div>
        <p className="mb-2">Level up your skills with gamified coding challenges and compete with peers.</p>
        <ul className="text-sm opacity-80 space-y-1">
          <li>• Algorithm challenges</li>
          <li>• Weekly competitions</li>
          <li>• Progress tracking</li>
        </ul>
      </div>
    ),
    color: '#d4af37',
    demoAction: 'Take Challenge',
  },
];

export default function MenuBoard() {
  const [selectedFeature, setSelectedFeature] = useState<typeof features[0] | null>(null);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  const handleDemoClick = (feature: typeof features[0]) => {
    setSelectedFeature(feature);
    setIsDemoModalOpen(true);
  };

  return (
    <>
      <FeatureDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        feature={selectedFeature}
      />
    <div
      className="relative py-20 px-4 min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at 60% 10%, #e7c08a22 0%, #f8f6f0 80%), linear-gradient(120deg, #fffdfa 0%, #f3e9dd 100%)',
        fontFamily: 'var(--font-body), sans-serif',
      }}
    >
      {/* Decorative SVGs */}
      <svg className="absolute top-10 left-10 w-20 h-20 opacity-30 z-0" viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="14" ry="8" fill="#e7c08a" /><ellipse cx="16" cy="16" rx="7" ry="4" fill="#fffdfa" opacity=".2"/></svg>
      <svg className="absolute bottom-20 right-16 w-32 h-32 opacity-20 z-0" viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="18" ry="9" fill="#a36a3e" /><ellipse cx="20" cy="20" rx="9" ry="4.5" fill="#fffdfa" opacity=".15"/></svg>
      <svg className="absolute top-1/2 left-1/3 w-32 h-32 opacity-10 z-0" viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="22" ry="10" fill="#231f20" /><ellipse cx="24" cy="24" rx="11" ry="5" fill="#fffdfa" opacity=".1"/></svg>
      {/* Coffee ring stains */}
      <svg className="absolute bottom-10 left-1/4 w-40 h-12 rotate-12 opacity-30 z-0" viewBox="0 0 128 40"><ellipse cx="64" cy="20" rx="60" ry="16" fill="none" stroke="#e7c08a" strokeWidth="4" opacity=".5"/><ellipse cx="64" cy="20" rx="50" ry="12" fill="none" stroke="#6f4e37" strokeWidth="2" opacity=".3"/></svg>
      {/* Header */}
      <header className="text-center mb-24 relative z-10">
        <div className="relative inline-block">
          <h1
            className="font-caveat text-6xl md:text-7xl lg:text-8xl font-extrabold bg-gradient-to-r from-[#a36a3e] via-[#e7c08a] to-[#814d33] bg-clip-text text-transparent drop-shadow-2xl inline-block animate-fade-in"
            style={{ 
              fontFamily: 'var(--font-heading), cursive', 
              letterSpacing: '0.04em', 
              transform: 'rotate(-2deg)',
              textShadow: '0 4px 8px rgba(163, 106, 62, 0.3)'
            }}
          >
            CAFÉCODE'S FEATURES
          </h1>
          {/* Animated underline */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-48 h-6 animate-fade-in" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
            <svg width="100%" height="24" viewBox="0 0 192 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 20C48 6 144 6 180 20" 
                stroke="url(#gradient)" 
                strokeWidth="6" 
                strokeLinecap="round"
                className="animate-draw-line"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a36a3e" />
                  <stop offset="50%" stopColor="#e7c08a" />
                  <stop offset="100%" stopColor="#814d33" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        
        <p className="font-body text-xl md:text-2xl text-[#231f20]/80 max-w-3xl mx-auto mt-8 animate-fade-in leading-relaxed" 
           style={{ 
             fontFamily: 'var(--font-body), sans-serif',
             animationDelay: '0.8s',
             animationFillMode: 'both'
           }}>
          Discover our premium coding tools and features, carefully crafted for developers at every level.
        </p>
        
        {/* Feature count badge */}
        <div className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-amber-200 animate-fade-in"
             style={{ animationDelay: '1.1s', animationFillMode: 'both' }}>
          <span className="text-2xl">✨</span>
          <span className="font-semibold text-[#6f4e37]">{features.length} Premium Features</span>
        </div>
      </header>

      {/* Menu Items */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 lg:gap-12 max-w-8xl mx-auto relative z-10 px-4">
        {features.map((feature, i) => (
          <div
            key={i}
            className="animate-fade-in transform-gpu"
            style={{
              animationDelay: `${i * 0.15 + 1.4}s`,
              animationFillMode: 'both',
            }}
          >
            <MenuItemCard {...feature} onDemoClick={() => handleDemoClick(feature)} />
          </div>
        ))}
      </section>
      
      {/* Call to action section */}
      <section className="text-center mt-20 relative z-10 animate-fade-in" style={{ animationDelay: '2.5s', animationFillMode: 'both' }}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-caveat text-4xl md:text-5xl font-bold text-[#6f4e37] mb-6" style={{ transform: 'rotate(-1deg)' }}>
            Ready to Start Your Coding Journey?
          </h2>
          <p className="text-lg text-[#5d4037] mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already brewing their perfect code with CaféCode's premium features.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="px-8 py-4 bg-gradient-to-r from-[#a36a3e] to-[#814d33] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 transform">
              Start Free Trial ☕
            </button>
            <button className="px-8 py-4 bg-white/80 backdrop-blur-sm text-[#6f4e37] font-semibold rounded-xl border-2 border-[#e7c08a] hover:bg-[#e7c08a] hover:text-white transition-all duration-300 hover:scale-105 transform">
              View Pricing 💰
            </button>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}