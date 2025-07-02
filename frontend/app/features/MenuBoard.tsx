import React from 'react';
import MenuItemCard from './MenuItemCard';
import { FaCoffee, FaWrench, FaLightbulb, FaWindowMaximize, FaComments, FaTrophy, FaCodeBranch } from 'react-icons/fa';

const features = [
  {
    icon: <FaCoffee />,
    title: 'Brewster AI Assistant',
    price: '☕ Premium Blend',
    tags: ['Code Analysis', 'AI Chat', '24/7 Available'],
    description: 'Personalized AI help, just like your favorite barista remembers your order.',
    color: '#6f4e37',
  },
  {
    icon: <><FaWrench className="inline mr-1" /><FaLightbulb className="inline ml-1" /></>,
    title: 'Fix & Understand Tools',
    price: '⚡ Express Service',
    tags: ['Auto Fix', 'Smart Hints', 'Learn Why'],
    description: 'Speedy code fixes and smart hints to help you learn and improve instantly.',
    color: '#f44336',
  },
  {
    icon: <FaWindowMaximize />,
    title: 'Browser Environment',
    price: '🚀 Instant Brew',
    tags: ['No Setup', 'Instant Run', 'All Browsers'],
    description: 'Run code instantly in your browser. No setup, no hassle, just code.',
    color: '#009688',
  },
  {
    icon: <FaComments />,
    title: 'Gabby Virtual Pal',
    price: '💝 Comfort Blend',
    tags: ['Project Support', 'Motivation', 'Always There'],
    description: 'A friendly chat pal to keep you motivated and supported on your journey.',
    color: '#e040fb',
  },
  {
    icon: <><FaTrophy className="inline mr-1" /><FaCodeBranch className="inline ml-1" /></>,
    title: 'LeetCode Practice',
    price: '🏆 Training Ground',
    tags: ['Problem Practice', 'Similar Generation', 'Step-by-Step', 'Interview Ready'],
    description: (
      <ul className="list-disc pl-5">
        <li>Practice real interview questions</li>
        <li>Step-by-step solutions</li>
        <li>Custom problem generation</li>
      </ul>
    ),
    color: '#6f42c1',
    featured: true,
  },
];

export default function MenuBoard() {
  return (
    <div className="min-h-screen w-full bg-[#f8f6f0] py-12 px-4 relative overflow-x-hidden">
      {/* Decorative SVGs */}
      <svg className="absolute top-10 left-10 w-16 h-16 animate-chalk-float opacity-60 z-0" viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="14" ry="8" fill="#6f4e37" /><ellipse cx="16" cy="16" rx="7" ry="4" fill="#f8f6f0" opacity=".2"/></svg>
      <svg className="absolute bottom-20 right-16 w-20 h-20 animate-chalk-float opacity-40 z-0" viewBox="0 0 40 40"><ellipse cx="20" cy="20" rx="18" ry="9" fill="#8b4513" /><ellipse cx="20" cy="20" rx="9" ry="4.5" fill="#f8f6f0" opacity=".15"/></svg>
      <svg className="absolute top-1/2 left-1/3 w-24 h-24 animate-chalk-float opacity-30 z-0" viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="22" ry="10" fill="#3c2414" /><ellipse cx="24" cy="24" rx="11" ry="5" fill="#f8f6f0" opacity=".1"/></svg>
      {/* Coffee ring stains */}
      <svg className="absolute bottom-10 left-1/4 w-32 h-10 rotate-12 opacity-20 z-0" viewBox="0 0 128 40"><ellipse cx="64" cy="20" rx="60" ry="16" fill="none" stroke="#f8f6f0" strokeWidth="4" opacity=".5"/><ellipse cx="64" cy="20" rx="50" ry="12" fill="none" stroke="#6f4e37" strokeWidth="2" opacity=".3"/></svg>
      {/* Header */}
      <header className="text-center mb-16 relative z-10">
        <h1
          className="font-caveat text-6xl md:text-7xl text-[#6f4e37] drop-shadow-lg inline-block"
          style={{ transform: 'rotate(-2deg)' }}
        >
          CAFÉCODE'S FEATURES
        </h1>
        <div className="w-32 h-4 mx-auto mt-2 mb-4">
          {/* Hand-drawn flourish SVG */}
          <svg width="100%" height="16" viewBox="0 0 128 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 12C24 4 104 4 124 12" stroke="#6f4e37" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="font-body text-lg text-[#3c2414]/80 max-w-xl mx-auto">
          Discover our coding blends, brewed for every developer.
        </p>
      </header>

      {/* Menu Items */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
        {features.map((feature, i) => (
          <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.1 + 0.2}s`, animationFillMode: 'both' }}>
            <MenuItemCard {...feature} />
          </div>
        ))}
      </section>

      {/* Footer */}
     
    </div>
  );
} 