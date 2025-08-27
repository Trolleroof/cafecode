import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeStage {
  id: string;
  title: string;
  beforeCode: string;
  afterCode: string;
  explanation: string;
  insights: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export default function CodeEvolutionTheater() {
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const theaterRef = useRef<HTMLDivElement>(null);
  const [ref, inView] = useInView({
    threshold: 0.2,
    triggerOnce: true
  });

  return (
    <div 
      ref={ref} 
      className="relative min-h-screen bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] text-white py-20 overflow-hidden"
    >
      {/* Theater Stage */}
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1 }}
          className="relative"
        >
          {/* Stage Curtains */}
          <div className="absolute -top-10 -left-20 w-[120%] h-20">
            <motion.div
              className="w-full h-full bg-gradient-to-b from-red-900 to-red-800"
              initial={{ scaleY: 1, originY: 0 }}
              animate={{ scaleY: isPlaying ? 0 : 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>

          {/* Main Stage */}
          <div className="relative bg-[#1e1e1e] rounded-lg shadow-2xl overflow-hidden">
            <TheaterStage
              isPlaying={isPlaying}
              activeStage={activeStage}
              onStageComplete={() => setIsPlaying(false)}
            />
          </div>
        </motion.div>

        {/* Code Evolution Timeline */}
        <div className="mt-20">
          <CodeTimeline
            activeStage={activeStage}
            onStageSelect={(stageId) => {
              setActiveStage(stageId);
              setIsPlaying(true);
            }}
          />
        </div>
      </div>

      {/* Ambient Lighting Effects */}
      <AmbientLighting isPlaying={isPlaying} />
    </div>
  );
}

function TheaterStage({ isPlaying, activeStage, onStageComplete }) {
  const stage = codeStages.find(s => s.id === activeStage);
  const [currentLine, setCurrentLine] = useState(0);
  
  useEffect(() => {
    if (isPlaying && stage) {
      const lines = stage.afterCode.split('\n').length;
      const interval = setInterval(() => {
        setCurrentLine(prev => {
          if (prev >= lines - 1) {
            clearInterval(interval);
            onStageComplete();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, stage]);

  if (!stage) return null;

  return (
    <div className="p-8">
      {/* Split Screen Comparison */}
      <div className="grid grid-cols-2 gap-8">
        {/* Before Code */}
        <div className="relative">
          <div className="absolute -top-6 left-0 text-sm text-gray-400">Before</div>
          <SyntaxHighlighter
            language="javascript"
            style={vscDarkPlus}
            className="rounded-lg !bg-black/30"
          >
            {stage.beforeCode}
          </SyntaxHighlighter>
        </div>

        {/* After Code */}
        <div className="relative">
          <div className="absolute -top-6 left-0 text-sm text-gray-400">After</div>
          <SyntaxHighlighter
            language="javascript"
            style={vscDarkPlus}
            className="rounded-lg !bg-black/30"
          >
            {stage.afterCode.split('\n')
              .slice(0, isPlaying ? currentLine + 1 : undefined)
              .join('\n')}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Explanation Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-6 bg-white/5 rounded-lg"
      >
        <h3 className="text-xl font-bold mb-4">{stage.title}</h3>
        <p className="text-gray-300 mb-6">{stage.explanation}</p>
        
        {/* Key Insights */}
        <div className="grid grid-cols-2 gap-4">
          {stage.insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.2 }}
              className="flex items-start gap-3"
            >
              <span className="text-amber-500 text-xl">•</span>
              <p className="text-sm text-gray-400">{insight}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function CodeTimeline({ activeStage, onStageSelect }) {
  return (
    <div className="relative">
      {/* Timeline Track */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-700 transform -translate-y-1/2" />

      {/* Timeline Nodes */}
      <div className="relative flex justify-between items-center">
        {codeStages.map((stage, index) => (
          <motion.button
            key={stage.id}
            className={`
              relative w-12 h-12 rounded-full 
              ${activeStage === stage.id ? 'bg-amber-500' : 'bg-gray-800'}
              transition-colors duration-300
            `}
            onClick={() => onStageSelect(stage.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Difficulty Indicator */}
            <div className={`
              absolute -top-8 left-1/2 transform -translate-x-1/2
              px-3 py-1 rounded-full text-xs
              ${getDifficultyColor(stage.difficulty)}
            `}>
              {stage.difficulty}
            </div>

            {/* Stage Number */}
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {index + 1}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function AmbientLighting({ isPlaying }) {
  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Spotlight Effect */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-[200vh] h-[200vh] rounded-full bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isPlaying ? 1 : 0,
          scale: isPlaying ? 1 : 0.8
        }}
        transition={{ duration: 2 }}
        style={{
          transform: 'translate(-50%, -50%)',
          filter: 'blur(100px)'
        }}
      />
    </div>
  );
}

// Helper function for difficulty colors
function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'beginner':
      return 'bg-green-500/20 text-green-400';
    case 'intermediate':
      return 'bg-blue-500/20 text-blue-400';
    case 'advanced':
      return 'bg-purple-500/20 text-purple-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}
