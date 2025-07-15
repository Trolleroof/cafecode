import React from 'react';
import MenuItemCard from './MenuItemCard';
import {
  IconCoffee,
  IconTool,
  IconBulb,
  IconWindow,
  IconMessage,
  IconTrophy
} from '@tabler/icons-react';
import Image from 'next/image';
import Leetcode from "/Users/nikhi/v2-bolt-hackathon-1/frontend/public/images/leetcode.png"

const features = [
  {
    icon: <IconCoffee />,
    title: 'Brewster AI Assistant',
    price: '☕ Premium Blend',
    tags: ['Code Analysis', 'AI Chat', '24/7 Available'],
    description: 'Personalized AI help, just like your favorite barista remembers your order.',
    color: '#a36a3e',
  },
  {
    icon: <IconTool className="inline mr-1" />,
    title: 'Fix & Understand',
    price: '⚡ Express Service',
    tags: ['Auto Fix', 'Smart Hints', 'Learn Why'],
    description: 'Speedy code fixes and smart hints to help you learn and improve instantly.',
    color: '#814d33',
  },
  {
    icon: <IconWindow />,
    title: 'Browser Environment',
    price: '🚀 Instant Brew',
    tags: ['No Setup', 'Instant Run', 'All Browsers'],
    description: 'Run code instantly in your browser. No setup, no hassle, just code.',
    color: '#6f4e37',
  },
  {
    icon: <IconMessage />,
    title: 'Gabby Virtual Pal',
    price: '💝 Comfort Blend',
    tags: ['Project Support', 'Motivation', 'Always There'],
    description: 'A friendly chat pal to keep you motivated and supported on your journey.',
    color: '#e7c08a',
  },
  {
    icon: <IconTrophy className="inline mr-1" />,
    title: 'LeetCode Practice',
    price: '🏆 Training Ground',
    tags: ['LeetCode', 'Problem Practice', 'Similar Generation', 'Step-by-Step', 'Interview Ready'],
    description: "Practice basic Leetcode problems and patterns that appear in SWE interviews",
    color: '#e7c08a',
    featured: true,
  },
];

export default function MenuBoard() {
  return (
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
      <header className="text-center mb-20 relative z-10">
        <h1
          className="font-caveat text-7xl md:text-8xl font-extrabold bg-gradient-to-r from-[#a36a3e] via-[#e7c08a] to-[#814d33] bg-clip-text text-transparent drop-shadow-lg inline-block"
          style={{ fontFamily: 'var(--font-heading), cursive', letterSpacing: '0.04em', transform: 'rotate(-2deg)' }}
        >
          CAFÉCODE'S FEATURES
        </h1>
        <div className="w-40 h-5 mx-auto mt-3 mb-4">
          {/* Gold flourish SVG */}
          <svg width="100%" height="20" viewBox="0 0 160 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 16C32 4 128 4 152 16" stroke="#e7c08a" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="font-body text-xl text-[#231f20]/80 max-w-2xl mx-auto mt-2" style={{ fontFamily: 'var(--font-body), sans-serif' }}>
          Discover our coding blends, brewed for every developer.
        </p>
      </header>

      {/* Menu Items */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto relative z-10">
        {features.map((feature, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              animationDelay: `${i * 0.1 + 0.2}s`,
              animationFillMode: 'both',
            }}
          >
            <MenuItemCard {...feature} />
          </div>
        ))}
      </section>
    </div>
  );
}