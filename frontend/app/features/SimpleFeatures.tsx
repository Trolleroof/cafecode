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
  position: 'left' | 'right' | 'center';
  comingSoon?: boolean;
}

export default function SimpleFeatures() {
  return (
    <div className="py-24 px-4 min-h-screen relative overflow-hidden"
         style={{
           background: 'linear-gradient(to bottom, #f8f6f0 0%, #f3e9dd 100%)',
         }}>
      
      {/* Creative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating coffee beans */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full opacity-20"
            style={{
              background: '#a36a3e',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold mb-6"
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
            className="text-xl md:text-2xl max-w-3xl mx-auto"
            style={{ 
              fontFamily: 'var(--font-body), sans-serif',
              color: '#6f4e37'
            }}
          >
            Four powerful tools that transform how you learn and code
          </motion.p>
        </div>

        {/* Creative Features Layout */}
        <div className="relative">
          {/* Top Row - 2 features */}
          <div className="flex justify-center gap-16 mb-16">
            <FeatureCard
              icon={<Coffee className="w-8 h-8" />}
              title="Brewster AI Assistant"
              description="Your personal coding companion that understands your style and provides intelligent suggestions, explanations, and optimizations."
              color="#a36a3e"
              position="left"
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8" />}
              title="Smart Code Fixes"
              description="Intelligent code analysis that catches errors before they become problems with real-time detection and one-click fixes."
              color="#814d33"
              position="right"
            />
          </div>

          {/* Bottom Row - 2 features */}
          <div className="flex justify-center gap-16">
            <FeatureCard
              icon={<Play className="w-8 h-8" />}
              title="Instant Code Runner"
              description="Execute code instantly in a fully-featured browser environment supporting 20+ languages with zero setup."
              color="#6f4e37"
              position="left"
            />
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8" />}
              title="Gabby, Virtual Mentor"
              description="Your coding journey companion providing personalized learning paths, interview prep, and portfolio guidance."
              color="#e7c08a"
              position="right"
              comingSoon={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, color, position, comingSoon }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="relative w-[500px]"
    >
      {/* Card */}
      <div className="relative p-8 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#e7c08a] shadow-lg">
        {/* Coming Soon Badge */}
        {comingSoon && (
          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
            Coming Soon
          </div>
        )}
        
        {/* Icon */}
        <div className="mb-6">
          <div 
            className="p-4 rounded-xl inline-block"
            style={{
              background: `${color}20`,
              color: color,
            }}
          >
            {icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-4 text-[#2d1810]">
          {title}
        </h3>

        {/* Description */}
        <p className="text-[#6f4e37] leading-relaxed text-lg">
          {description}
        </p>

        {/* Decorative accent */}
        <div 
          className="absolute bottom-0 left-0 w-full h-1 rounded-b-2xl"
          style={{ background: color }}
        />
      </div>

      {/* Connection line to next feature */}
      {position !== 'right' && (
        <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-[#e7c08a] to-transparent" />
      )}
    </motion.div>
  );
}