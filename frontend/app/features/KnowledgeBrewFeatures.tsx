import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface BrewingStage {
  id: string;
  title: string;
  description: string;
  complexity: number;
  brewTime: number;
  codeExample: string;
}

interface BrewingStageCardProps {
  stage: BrewingStage;
  index: number;
  isActive: boolean;
  onActivate: () => void;
}

// Brewing stages data
const brewingStages: BrewingStage[] = [
  {
    id: 'variables',
    title: 'Variables & Data Types',
    description: 'Learn the building blocks of programming - storing and manipulating data.',
    complexity: 0.2,
    brewTime: 30,
    codeExample: `let name = "Coffee";
const temperature = 85;
let isReady = true;`
  },
  {
    id: 'functions',
    title: 'Functions & Logic',
    description: 'Create reusable code blocks and control program flow.',
    complexity: 0.4,
    brewTime: 45,
    codeExample: `function brewCoffee(beans, water) {
  if (beans > 0 && water > 0) {
    return "Perfect brew!";
  }
  return "Need ingredients!";
}`
  },
  {
    id: 'objects',
    title: 'Objects & Classes',
    description: 'Organize code into logical structures and blueprints.',
    complexity: 0.6,
    brewTime: 60,
    codeExample: `class CoffeeMachine {
  constructor(brand) {
    this.brand = brand;
    this.isOn = false;
  }
  
  turnOn() {
    this.isOn = true;
  }
}`
  },
  {
    id: 'async',
    title: 'Async Programming',
    description: 'Handle operations that take time without blocking your code.',
    complexity: 0.8,
    brewTime: 75,
    codeExample: `async function brewAsync() {
  try {
    await heatWater();
    await grindBeans();
    return "Coffee ready!";
  } catch (error) {
    console.error("Brewing failed:", error);
  }
}`
  },
  {
    id: 'testing',
    title: 'Testing & Debugging',
    description: 'Ensure your code works correctly and fix issues efficiently.',
    complexity: 1.0,
    brewTime: 90,
    codeExample: `describe('Coffee Brewing', () => {
  test('should brew coffee correctly', () => {
    const result = brewCoffee('arabica', 200);
    expect(result).toBe('Perfect brew!');
  });
});`
  }
];

export default function KnowledgeBrewFeatures() {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [brewProgress, setBrewProgress] = useState(0);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2d1b1b] text-white py-20 overflow-hidden">
      {/* Animated Background Coffee Beans */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-4 h-4 bg-amber-600 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-amber-500 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-40 left-20 w-5 h-5 bg-amber-400 rounded-full opacity-25 animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 right-40 w-2 h-2 bg-amber-600 rounded-full opacity-20 animate-bounce" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
            Knowledge Brew
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Brew your coding knowledge one concept at a time, like crafting the perfect cup of coffee
          </p>
        </div>

        {/* Circular Brewing Progress */}
        <div className="flex justify-center mb-20">
          <div className="relative w-64 h-64">
            <svg className="transform -rotate-90 w-full h-full">
              <circle
                className="text-gray-700"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="120"
                cx="128"
                cy="128"
              />
              <motion.circle
                className="text-amber-500"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r="120"
                cx="128"
                cy="128"
                style={{
                  strokeDasharray: "753.6",
                  strokeDashoffset: 753.6 * (1 - brewProgress),
                }}
                initial={{ strokeDashoffset: 753.6 }}
                animate={{ strokeDashoffset: 753.6 * (1 - brewProgress) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-4xl font-bold text-amber-400">
                  {Math.round(brewProgress * 100)}%
                </span>
                <p className="text-sm text-gray-400 mt-2">Brewed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Brewing Stages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {brewingStages.map((stage, index) => (
            <BrewingStageCard
              key={stage.id}
              stage={stage}
              index={index}
              isActive={activeStage === stage.id}
              onActivate={() => {
                setActiveStage(stage.id);
                setBrewProgress((index + 1) / brewingStages.length);
              }}
            />
          ))}
        </div>
      </div>

      {/* Steam Effect */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <SteamEffect />
      </div>
    </div>
  );
}

function BrewingStageCard({ stage, index, isActive, onActivate }: BrewingStageCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative p-6 rounded-xl backdrop-blur-md cursor-pointer
        ${isActive ? 'bg-white/20 shadow-2xl shadow-amber-500/20' : 'bg-white/10 hover:bg-white/15'}
        border border-white/20 hover:border-amber-500/50
        transition-all duration-300 transform
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onActivate}
    >
      {/* Brewing Timer */}
      <div className="absolute -top-3 -right-3">
        <motion.div 
          className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-full p-3 shadow-lg"
          animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-sm font-mono text-black font-bold">
            {stage.brewTime}s
          </span>
        </motion.div>
      </div>

      {/* Stage Number */}
      <div className="absolute -top-3 -left-3">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm">
          {index + 1}
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
        {stage.title}
      </h3>

      {/* Code Preview */}
      <div className="mb-4 rounded-lg bg-black/50 p-4 overflow-hidden border border-gray-700">
        <pre className="text-sm text-green-400">
          <code>{stage.codeExample}</code>
        </pre>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed mb-4">
        {stage.description}
      </p>

      {/* Complexity Meter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-400">Complexity:</span>
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stage.complexity * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs text-amber-400 font-mono">
          {Math.round(stage.complexity * 100)}%
        </span>
      </div>

      {/* Interactive Elements */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-white/10"
        >
          <button className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 transition-all duration-300 text-black font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            Start Coding →
          </button>
        </motion.div>
      )}

      {/* Hover Effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent rounded-xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
}

function SteamEffect() {
  return (
    <div className="relative w-full h-full">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-24 bg-gradient-to-t from-transparent via-white/10 to-transparent rounded-full"
          animate={{
            y: [-50, -400],
            x: Math.sin(i * 0.5) * 40,
            opacity: [0, 0.3, 0],
            scale: [1, 1.5, 0.8],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.15,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            bottom: '0%',
          }}
        />
      ))}
    </div>
  );
}
