import React, { useState, useEffect } from 'react';

interface ProjectSetupLoaderProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  progress?: number;
  showProgress?: boolean;
  autoProgress?: boolean;
  progressSpeed?: 'slow' | 'normal' | 'fast';
  showSpinner?: boolean;
  spinnerSize?: 'small' | 'medium' | 'large';
  customSpinner?: React.ReactNode;
  dynamicMessages?: string[];
  messageInterval?: number;
  countUpProgress?: boolean;
  countUpSpeed?: number;
}

export default function ProjectSetupLoader({ 
  isOpen, 
  title = "Setting Up Your Project",
  description = "Creating guided steps and preparing your workspace...",
  progress = 99,
  showProgress = true,
  autoProgress = false,
  progressSpeed = 'normal',
  showSpinner = true,
  spinnerSize = 'medium',
  customSpinner,
  dynamicMessages = [],
  messageInterval = 5000, // Slower message interval
  countUpProgress = true,
  countUpSpeed = 200 // Slower count up speed
}: ProjectSetupLoaderProps) {
  const [currentProgress, setCurrentProgress] = useState(0);
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedDescription, setDisplayedDescription] = useState(description);
  const [isTyping, setIsTyping] = useState(false);

  // Auto-progress functionality
  useEffect(() => {
    if (isOpen && autoProgress) {
      setIsAnimating(true);
      setCurrentProgress(0);
      setDisplayedProgress(0);
      
      const speedMap = {
        slow: 200,
        normal: 100,
        fast: 50
      };
      
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          if (prev >= progress) {
            clearInterval(interval);
            setIsAnimating(false);
            return progress;
          }
          return prev + 1;
        });
      }, speedMap[progressSpeed]);
      
      return () => clearInterval(interval);
    } else if (isOpen) {
      setCurrentProgress(progress);
      setDisplayedProgress(0);
    }
  }, [isOpen, autoProgress, progress, progressSpeed]);

  // Count-up progress animation
  useEffect(() => {
    if (isOpen && countUpProgress) {
      const targetProgress = autoProgress ? currentProgress : progress;
      
      if (displayedProgress < targetProgress) {
        const increment = Math.max(1, Math.ceil((targetProgress - displayedProgress) / 10));
        const timer = setTimeout(() => {
          setDisplayedProgress(prev => Math.min(prev + increment, targetProgress));
        }, countUpSpeed);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, displayedProgress, currentProgress, progress, autoProgress, countUpProgress, countUpSpeed]);

  // Dynamic message rotation
  useEffect(() => {
    if (isOpen && dynamicMessages.length > 0) {
      const interval = setInterval(() => {
        setCurrentMessageIndex(prev => (prev + 1) % dynamicMessages.length);
      }, messageInterval);
      
      return () => clearInterval(interval);
    }
  }, [isOpen, dynamicMessages, messageInterval]);

  // Typewriter effect for dynamic messages
  useEffect(() => {
    if (dynamicMessages.length > 0 && isOpen) {
      const currentMessage = dynamicMessages[currentMessageIndex];
      setIsTyping(true);
      
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex <= currentMessage.length) {
          setDisplayedDescription(currentMessage.slice(0, charIndex));
          charIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
        }
      }, 50);
      
      return () => clearInterval(typeInterval);
    } else {
      setDisplayedDescription(description);
    }
  }, [currentMessageIndex, dynamicMessages, isOpen, description]);

  // Reset progress when component opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentProgress(autoProgress ? 0 : progress);
      setDisplayedProgress(0);
      setCurrentMessageIndex(0);
    }
  }, [isOpen, progress, autoProgress]);

  if (!isOpen) return null;

  const spinnerSizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-20 h-20'
  };

  const progressWidth = autoProgress ? currentProgress : progress;
  const animatedProgressWidth = countUpProgress ? displayedProgress : progressWidth;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] animate-fade-in">
      <div className="bg-light-cream rounded-2xl shadow-2xl p-8 w-full max-w-lg text-center border border-medium-coffee/20 animate-scale-in">
        {/* Enhanced Swirling Loading Spinner */}
        {showSpinner && (
          <div className={`${spinnerSizeClasses[spinnerSize]} mx-auto mb-6 relative`}>
            {customSpinner ? (
              customSpinner
            ) : (
              <>
                {/* Main swirling ring with multiple layers */}
                <div className="w-full h-full border-4 border-medium-coffee/20 border-t-medium-coffee rounded-full animate-spin"></div>
                
                {/* Second swirling ring (counter-rotation) */}
                <div className="absolute inset-1 border-3 border-deep-espresso/30 border-b-transparent rounded-full animate-spin-reverse"></div>
                
                {/* Third swirling ring (faster rotation) */}
                <div className="absolute inset-2 border-2 border-medium-coffee/40 border-r-transparent rounded-full animate-spin-fast"></div>
                
                {/* Inner pulsing circle with gradient */}
                <div className="absolute inset-3 bg-gradient-to-br from-medium-coffee/40 to-deep-espresso/40 rounded-full animate-pulse"></div>
                
                {/* Center dot with bounce effect (use universal loader) */}
                <div className="absolute inset-5 flex items-center justify-center">
                  <span className="universal-loader-dot delay-1" />
                </div>
                
                {/* Outer glow effect with multiple layers */}
                <div className="absolute -inset-2 bg-gradient-to-r from-medium-coffee/20 via-deep-espresso/30 to-medium-coffee/20 rounded-full blur-md animate-pulse"></div>
                
                {/* Floating particles around the spinner */}
                <div className="absolute -inset-4 w-full h-full">
                  <div className="absolute top-0 left-1/2 w-2 h-2 bg-medium-coffee/60 rounded-full animate-float-1"></div>
                  <div className="absolute top-1/4 right-0 w-1.5 h-1.5 bg-deep-espresso/50 rounded-full animate-float-2"></div>
                  <div className="absolute bottom-1/4 left-0 w-1 h-1 bg-medium-coffee/40 rounded-full animate-float-3"></div>
                  <div className="absolute bottom-0 right-1/4 w-1.5 h-1.5 bg-deep-espresso/60 rounded-full animate-float-4"></div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Dynamic Title with typing effect */}
        <h3 className="text-2xl font-bold text-deep-espresso mb-4 animate-fade-in-up">
          {title}
        </h3>
        
        {/* Dynamic Description with typewriter effect */}
        <p className="text-deep-espresso/80 text-lg mb-6 animate-fade-in-up animation-delay-200 min-h-[1.5rem]">
          {displayedDescription}
          {isTyping && <span className="animate-pulse">|</span>}
        </p>
        
        {/* Enhanced Progress Bar with Count-up Animation */}
        {showProgress && (
          <>
            <div className="w-full h-3 bg-cream-beige rounded-full overflow-hidden mb-4 relative">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-cream-beige to-medium-coffee/20 rounded-full"></div>
              
              {/* Progress bar with smooth animation */}
              <div 
                className="h-full bg-gradient-to-r from-medium-coffee to-deep-espresso rounded-full transition-all duration-500 ease-out shadow-lg relative overflow-hidden"
                style={{ width: `${animatedProgressWidth}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                
                {/* Progress bar inner glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                
                {/* Progress bar pulse effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>
              </div>
              
              {/* Progress bar glow */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-medium-coffee/20 to-deep-espresso/20 rounded-full blur-sm transition-all duration-500"
                style={{ width: `${animatedProgressWidth}%` }}
              ></div>
              
              {/* Progress bar completion sparkle */}
              {animatedProgressWidth >= 100 && (
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/40 via-white/60 to-yellow-300/40 animate-pulse"></div>
              )}
            </div>
            
            {/* Progress percentage with count-up animation */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-deep-espresso font-bold text-2xl">
                {Math.round(animatedProgressWidth)}
              </span>
              <span className="text-deep-espresso font-semibold text-lg">%</span>
            </div>
            
            {/* Progress status text */}
            <p className="text-deep-espresso/70 text-sm font-medium animate-fade-in-up">
              {animatedProgressWidth < 25 && "Getting started..."}
              {animatedProgressWidth >= 25 && animatedProgressWidth < 50 && "Making progress..."}
              {animatedProgressWidth >= 50 && animatedProgressWidth < 75 && "Almost there..."}
              {animatedProgressWidth >= 75 && animatedProgressWidth < 100 && "Finalizing..."}
              {animatedProgressWidth >= 100 && "Complete! 🎉"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
