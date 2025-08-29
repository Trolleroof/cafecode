import React from 'react';
import { motion } from 'framer-motion';
import {
  Coffee,
  Zap,
  Play,
  MessageCircle,
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  comingSoon?: boolean;
}

export default function SimpleFeatures() {
  return (
    <div className="py-16 md:py-20 px-4 relative overflow-hidden bg-light-cream">
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6"
            style={{ 
              fontFamily: 'var(--font-heading), sans-serif',
              background: 'linear-gradient(to right, #2d1810, #a36a3e, #814d33)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Core Features
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto px-4"
            style={{ 
              fontFamily: 'var(--font-body), sans-serif',
              color: '#6f4e37'
            }}
          >
            Four powerful tools that transform how you learn and code
          </motion.p>
        </div>

        {/* Responsive Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10 px-4">
          <FeatureCard
            icon={<Coffee className="w-6 h-6 md:w-8 md:h-8" />}
            title="Brewster AI Assistant"
            description="Your personal coding companion that understands your style and provides intelligent suggestions, explanations, and optimizations."
            color="#a36a3e"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6 md:w-8 md:h-8" />}
            title="Smart Code Fixes"
            description="Intelligent code analysis that catches errors before they become problems with real-time detection and one-click fixes."
            color="#814d33"
          />
          <FeatureCard
            icon={<Play className="w-6 h-6 md:w-8 md:h-8" />}
            title="Instant Code Runner"
            description="Execute code instantly in a fully-featured browser environment supporting 20+ languages with zero setup."
            color="#6f4e37"
          />
          <FeatureCard
            icon={<MessageCircle className="w-6 h-6 md:w-8 md:h-8" />}
            title="Gabby, Virtual Mentor"
            description="Your coding journey companion providing personalized learning paths, interview prep, and portfolio guidance."
            color="#e7c08a"
            comingSoon={true}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, color, comingSoon }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="w-full"
    >
      {/* Card */}
      <div className="relative p-6 md:p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#e7c08a] shadow-lg h-full">
        {/* Coming Soon Badge */}
        {comingSoon && (
          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Coming Soon
          </div>
        )}
        
        {/* Icon */}
        <div className="mb-4 md:mb-6">
          <div 
            className="p-3 md:p-4 rounded-xl inline-block"
            style={{
              background: `${color}20`,
              color: color,
            }}
          >
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[#2d1810]">
          {title}
        </h3>

        {/* Description */}
        <p className="text-[#6f4e37] leading-relaxed text-base md:text-lg">
          {description}
        </p>

        {/* Decorative accent */}
        <div 
          className="absolute bottom-0 left-0 w-full h-1 rounded-b-2xl"
          style={{ background: color }}
        />
      </div>
    </motion.div>
  );
}