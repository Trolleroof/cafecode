import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/web';

interface BrewingStage {
  id: string;
  title: string;
  description: string;
  complexity: number;
  brewTime: number;
  codeExample: string;
}

export default function KnowledgeBrewFeatures() {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [brewProgress, setBrewProgress] = useState(0);

  return (
    <div className="relative min-h-screen bg-[#1a1a1a] text-white py-20">
      {/* 3D Coffee Cup Visualization */}
      <div className="absolute inset-0 pointer-events-none">
        <Canvas>
          <CoffeeCup progress={brewProgress} />
        </Canvas>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
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
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold">
                {Math.round(brewProgress * 100)}%
              </span>
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

function BrewingStageCard({ stage, index, isActive, onActivate }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const springProps = useSpring({
    scale: isHovered ? 1.05 : 1,
    config: { tension: 300, friction: 10 }
  });

  return (
    <animated.div
      style={springProps}
      className={`
        relative p-6 rounded-xl backdrop-blur-md
        ${isActive ? 'bg-white/15' : 'bg-white/10'}
        border border-white/20 hover:border-amber-500/50
        transition-colors duration-300
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onActivate}
    >
      {/* Brewing Timer */}
      <div className="absolute -top-3 -right-3">
        <div className="bg-amber-500 rounded-full p-2 shadow-lg">
          <span className="text-sm font-mono">
            {stage.brewTime}s
          </span>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
        {stage.title}
      </h3>

      {/* Code Preview with Syntax Highlighting */}
      <div className="mb-4 rounded-lg bg-black/50 p-4 overflow-hidden">
        <pre className="text-sm">
          <code className="language-javascript">
            {stage.codeExample}
          </code>
        </pre>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed mb-4">
        {stage.description}
      </p>

      {/* Complexity Meter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Complexity:</span>
        <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-600"
            initial={{ width: 0 }}
            animate={{ width: `${stage.complexity * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Interactive Elements */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-white/10"
        >
          <button className="w-full py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 transition-colors text-black font-semibold">
            Start Brewing →
          </button>
        </motion.div>
      )}
    </animated.div>
  );
}

function SteamEffect() {
  return (
    <div className="relative w-full h-full">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-20 bg-gradient-to-t from-transparent via-white/5 to-transparent rounded-full"
          animate={{
            y: [-100, -300],
            x: Math.sin(i) * 30,
            opacity: [0, 0.2, 0],
            scale: [1, 2, 0.5],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: i * 0.2,
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

// 3D Coffee Cup Component using React Three Fiber
function CoffeeCup({ progress }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <mesh>
        <cylinderGeometry args={[1, 0.8, 2, 32]} />
        <meshStandardMaterial color="#814d33" />
      </mesh>
      {/* Add liquid level based on progress */}
      <mesh position={[0, -1 + progress * 2, 0]}>
        <cylinderGeometry args={[0.9, 0.7, 0.1, 32]} />
        <meshStandardMaterial 
          color="#a36a3e"
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
    </>
  );
}
