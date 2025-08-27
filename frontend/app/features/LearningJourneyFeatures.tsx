import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface FeatureNode {
  id: string;
  title: string;
  description: string;
  code: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  position: 'left' | 'right' | 'center';
}

export default function LearningJourneyFeatures() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Smooth progress indicator
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen py-20 overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 30% 20%, rgba(231, 192, 138, 0.08) 0%, rgba(248, 246, 240, 0) 50%)',
      }}
    >
      {/* Flowing Path Animation */}
      <svg 
        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[120%] max-w-none"
        style={{ filter: 'url(#gooey)' }}
      >
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="gooey" 
            />
          </filter>
        </defs>
        
        {/* Organic flowing path */}
        <motion.path
          d="M 100,0 C 200,100 100,200 200,300 C 300,400 200,500 300,600"
          stroke="url(#journeyGradient)"
          strokeWidth="4"
          fill="none"
          style={{
            pathLength: smoothProgress
          }}
        />
        
        <linearGradient id="journeyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a36a3e" />
          <stop offset="50%" stopColor="#e7c08a" />
          <stop offset="100%" stopColor="#814d33" />
        </linearGradient>
      </svg>

      {/* Feature Nodes */}
      {features.map((feature, index) => (
        <FeatureNode
          key={feature.id}
          feature={feature}
          index={index}
          isActive={activeNode === feature.id}
          onActivate={() => setActiveNode(feature.id)}
        />
      ))}

      {/* Steam Particles */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <SteamParticles />
      </div>
    </div>
  );
}

// Individual Feature Node Component
function FeatureNode({ feature, index, isActive, onActivate }) {
  const [ref, inView] = useInView({
    threshold: 0.5,
    triggerOnce: true
  });

  return (
    <motion.div
      ref={ref}
      className={`absolute ${getPositionClasses(feature.position, index)}`}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.2 }}
    >
      <div 
        className={`
          relative p-8 rounded-2xl backdrop-blur-sm
          ${isActive ? 'bg-white/90' : 'bg-white/70'}
          transition-all duration-500 hover:scale-105
          ${feature.level === 'advanced' ? 'border-2 border-amber-300' : ''}
        `}
      >
        {/* Interactive Code Preview */}
        <div className="mb-6 overflow-hidden rounded-lg bg-[#1e1e1e] p-4">
          <pre className="text-sm">
            <code className="language-javascript">
              {feature.code}
            </code>
          </pre>
        </div>

        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-[#a36a3e] to-[#814d33] bg-clip-text text-transparent">
          {feature.title}
        </h3>

        <p className="text-[#5d4037] leading-relaxed">
          {feature.description}
        </p>

        {/* Knowledge Meter */}
        <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
            initial={{ width: 0 }}
            animate={{ width: isActive ? '100%' : '30%' }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Steam Particle Animation
function SteamParticles() {
  return (
    <div className="relative w-full h-full">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/20 blur-sm"
          animate={{
            y: [-20, -100],
            x: Math.sin(i) * 20,
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.2,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

// Helper function to calculate position classes
function getPositionClasses(position: string, index: number): string {
  const baseClasses = 'transform transition-all duration-500';
  
  switch (position) {
    case 'left':
      return `${baseClasses} left-[20%] top-[${index * 25}%]`;
    case 'right':
      return `${baseClasses} right-[20%] top-[${(index + 0.5) * 25}%]`;
    default:
      return `${baseClasses} left-1/2 -translate-x-1/2 top-[${index * 30}%]`;
  }
}
