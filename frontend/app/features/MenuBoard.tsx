'use client';

import React from 'react';
import SimpleFeatures from './SimpleFeatures';
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
  return <SimpleFeatures />;
}