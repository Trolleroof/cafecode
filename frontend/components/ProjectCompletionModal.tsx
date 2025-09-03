'use client';

import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import Image from 'next/image';

interface ProjectCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectFiles?: any[];
  chatHistory?: any[];
  guidedProject?: any;
  session?: any;
}

const ProjectCompletionModal: React.FC<ProjectCompletionModalProps> = ({ 
  isOpen, 
  onClose, 
  projectFiles = [],
  chatHistory = [],
  guidedProject = null,
  session = null
}) => {
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const [recapText, setRecapText] = useState('');
  const [isRecapLoading, setIsRecapLoading] = useState(false);

  // Call the recap API when modal opens (only if we don't have a recap yet)
  useEffect(() => {
    if (isOpen && !recapText) {
      console.log('🎯 Modal opened, attempting to fetch recap...');
      console.log('📁 Project files:', projectFiles);
      console.log('💬 Chat history length:', chatHistory?.length);
      console.log('🔑 Session:', !!session?.access_token);
      
      setIsRecapLoading(true);
      (async () => {
        try {
          // Try to call the recap API if we have data
          if (projectFiles.length > 0 || chatHistory.length > 0) {
            console.log('📡 Calling recap API...');
            const response = await fetch('/api/recap/recap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({
                projectFiles,
                chatHistory,
                guidedProject,
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ API Error:', response.status, errorText);
              throw new Error(`API error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ API Success:', result);
            setRecapText(result.recap || 'Here is a summary of what you learned!');
          } else {
            // Fallback content if no project data
            console.log('📝 No project data, using fallback content');
            setRecapText('🎉 Congratulations on completing your project!\n\nYou\'ve successfully finished your guided coding journey.\n\nKeep building amazing things!');
          }
        } catch (e) {
          console.error('❌ Recap API call failed:', e);
          // Fallback content on API failure
          setRecapText('🎉 Congratulations on completing your project!\n\nYou\'ve successfully finished your guided coding journey.\n\nKeep building amazing things!');
        } finally {
          setIsRecapLoading(false);
        }
      })();
    }
  }, [isOpen, projectFiles, chatHistory, guidedProject, session]); // Removed recapText from dependencies

  // Reset recap text when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRecapText('');
      setIsRecapLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && confettiCanvasRef.current) {
      // Create a confetti cannon effect with Cafécode colors
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#A36A3E', '#E7C08A', '#814D33', '#F3E4D4', '#1C1C1C'],
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#A36A3E', '#E7C08A', '#814D33', '#F3E4D4', '#1C1C1C'],
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
        colors: ['#A36A3E', '#E7C08A', '#814D33', '#F3E4D4', '#1C1C1C'],
      });

      // Start the continuous side cannons
      frame();
    }
  }, [isOpen]);

  // Debug logging when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🎉 ProjectCompletionModal opened!');
      console.log('📁 Project files:', projectFiles);
      console.log('💬 Chat history:', chatHistory);
      console.log('🎯 Guided project:', guidedProject);
      console.log('🔑 Session:', session);
    }
  }, [isOpen, projectFiles, chatHistory, guidedProject, session]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-light-cream z-50">
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100%', height: '100%' }}
      />
      <div className={`relative flex flex-col items-center w-full h-full bg-light-cream transition-all duration-700 ease-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}>
        {/* Content Container */}
        <div className="flex flex-col items-center justify-center w-full h-full p-6 sm:p-8 lg:p-10 text-center">
          {/* Cafécode Logo */}
          <div className="flex items-center space-x-3 mb-6 sm:mb-8">
            <Image 
              src="/images/logo.png" 
              alt="Cafécode Logo" 
              width={48} 
              height={48} 
              className="rounded-xl sm:w-14 sm:h-14 lg:w-18 lg:h-18"
            />
            <span className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-medium-coffee">
              Cafécode
            </span>
          </div>

          {/* Success Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-gradient-to-r from-medium-coffee to-deep-espresso rounded-full flex items-center justify-center mb-6 sm:mb-8 animate-warm-glow">
            <span className="text-4xl sm:text-5xl lg:text-6xl">🎉</span>
          </div>

          {/* Main Title */}
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-dark-charcoal mb-4 sm:mb-6 text-center leading-tight">
            You finished the project!
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-deep-espresso mb-6 sm:mb-8 text-center leading-relaxed max-w-lg sm:max-w-xl px-4">
            You finished your Cafécode guided project.<br/>
            Take a moment to celebrate your progress!
          </p>
          
          {/* AI Recap Section */}
          <div className={`w-full max-w-lg sm:max-w-2xl lg:max-w-3xl bg-cream-beige rounded-2xl p-5 sm:p-6 pb-8 sm:pb-10 mb-6 sm:mb-8 border border-medium-coffee/20 overflow-y-auto scrollbar-thin scrollbar-track-cream-beige scrollbar-thumb-medium-coffee hover:scrollbar-thumb-deep-espresso ${
            recapText && recapText.split('\n').filter(line => line.trim()).length > 3 
              ? 'max-h-[15vh] sm:max-h-[18vh]' 
              : 'max-h-fit'
          }`}>
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-dark-charcoal mb-4 sm:mb-5 text-center">
              Learning Recap
            </h2>
            
            {isRecapLoading ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-medium-coffee rounded-full animate-pulse"></div>
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-medium-coffee rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-medium-coffee rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            ) : recapText ? (
              <div className="space-y-3 sm:space-y-4 text-left pb-4">
                {recapText.split('\n').filter(line => line.trim()).map((line, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-medium-coffee rounded-full mt-1.5 sm:mt-2 flex-shrink-0"></div>
                    <p className="text-sm sm:text-base lg:text-lg text-dark-charcoal leading-relaxed">{line.trim()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-dark-charcoal/70 pb-4">
                <p className="text-sm">Loading recap...</p>
              </div>
            )}
          </div>
          
          {/* Action Button */}
          <button
            className="px-8 sm:px-10 lg:px-12 py-3 sm:py-4 lg:py-5 rounded-2xl bg-gradient-to-r from-medium-coffee to-deep-espresso text-light-cream font-semibold text-base sm:text-lg lg:text-xl hover:from-deep-espresso hover:to-medium-coffee transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-medium-coffee focus:ring-offset-4 shadow-2xl"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCompletionModal;
