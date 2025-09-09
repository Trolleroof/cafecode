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
  recap?: string;
  hasUnlimitedAccess?: boolean;
}

const ProjectCompletionModal: React.FC<ProjectCompletionModalProps> = ({ 
  isOpen, 
  onClose, 
  projectFiles = [],
  chatHistory = [],
  guidedProject = null,
  session = null,
  recap = '',
  hasUnlimitedAccess = false,
}) => {
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const [recapText, setRecapText] = useState('');
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setDownloadError(null);
      setIsDownloading(true);
      const resp = await fetch(`/api/files/download-zip?path=.`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setDownloadError(err?.error || 'Failed to download project');
        setIsDownloading(false);
        return;
      }
      // Extract filename from header if present
      const disp = resp.headers.get('Content-Disposition') || '';
      const m = disp.match(/filename\s*=\s*"?([^";]+)"?/i);
      const filename = m?.[1] || 'project.zip';
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setDownloadError(e?.message || 'Failed to download project');
    } finally {
      setIsDownloading(false);
    }
  };

  // Set recap content provided from completeProject route
  useEffect(() => {
    if (isOpen) {
      setIsRecapLoading(false);
      if (recap && typeof recap === 'string') {
        setRecapText(recap);
      } else {
        setRecapText('🎉 Congratulations on completing your project!\n\nYou\'ve successfully finished your guided coding journey.\n\nKeep building amazing things!');
      }
    }
  }, [isOpen, recap]);

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
          
          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center">
            {hasUnlimitedAccess && (
              <button
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-cream-beige text-deep-espresso font-semibold text-sm sm:text-base border border-medium-coffee/30 hover:bg-light-cream transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleDownload}
                disabled={isDownloading || !session?.access_token}
                title={!session?.access_token ? 'Sign in required' : 'Download your project as ZIP'}
              >
                {isDownloading ? 'Preparing ZIP…' : 'Download Project (.zip)'}
              </button>
            )}
            <button
              className="px-8 sm:px-10 lg:px-12 py-3 sm:py-4 lg:py-5 rounded-2xl bg-gradient-to-r from-medium-coffee to-deep-espresso text-light-cream font-semibold text-base sm:text-lg lg:text-xl hover:from-deep-espresso hover:to-medium-coffee transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-medium-coffee focus:ring-offset-4 shadow-2xl"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          {downloadError && (
            <p className="mt-3 text-sm text-red-600">{downloadError}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCompletionModal;
