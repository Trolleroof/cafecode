'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ProjectCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProjectCompletionModal: React.FC<ProjectCompletionModalProps> = ({ isOpen, onClose }) => {
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && confettiCanvasRef.current) {
      // Create a confetti cannon effect
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#FFD700', '#FFA500', '#8B4513', '#D2691E', '#CD853F'],
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#FFD700', '#FFA500', '#8B4513', '#D2691E', '#CD853F'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Fire initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#8B4513', '#D2691E', '#CD853F'],
      });

      // Start the continuous side cannons
      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="relative flex flex-col items-center max-w-lg w-full p-0 animate-fade-in">
        {/* Title and Subtitle with enhanced typography */}
        <h2 className="text-4xl font-extrabold text-deep-espresso mb-3 mt-2 text-center drop-shadow-sm bg-gradient-to-r from-deep-espresso to-medium-coffee bg-clip-text text-transparent">
          You finished the project!
        </h2>
        <p className="text-xl text-medium-coffee mb-6 text-center font-medium leading-relaxed">
          You finished your Cafécode guided project.<br/>
          Take a sip, celebrate, and keep building! <span className="inline-block animate-pulse">☕️</span>
        </p>
        
        {/* Enhanced Congrats Card */}
        <div className="w-full bg-gradient-to-br from-white to-light-cream rounded-3xl p-8 shadow-2xl border-2 border-medium-coffee/20 flex flex-col items-center mb-6 min-h-[120px] transform hover:scale-105 transition-transform duration-300">
          <div className="text-center">
            <h3 className="font-extrabold text-2xl mb-3 text-medium-coffee">
              🎯 Mission Accomplished! 🎯
            </h3>
            <p className="text-dark-charcoal/80 text-lg font-medium">
              You've successfully completed all the steps and learned valuable coding skills!
            </p>
          </div>
        </div>
        
        {/* Enhanced Close Button */}
        <button
          className="mt-2 mb-8 px-12 py-4 rounded-2xl bg-gradient-to-r from-medium-coffee to-deep-espresso text-light-cream font-bold text-xl shadow-xl hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-medium-coffee/30 focus:ring-offset-2 transform hover:scale-105 border-2 border-light-cream/20"
          onClick={onClose}
        >
          🎉 Close & Celebrate! 🎉
        </button>
      </div>
    </div>
  );
};

export default ProjectCompletionModal;
