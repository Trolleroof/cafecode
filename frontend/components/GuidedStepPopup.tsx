import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { CheckCircle, ArrowLeft, ArrowRight, Search, Loader2, Lock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GuidedStepPopupProps {
  instruction: string;
  isComplete: boolean;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onCheckStep: () => void;
  stepNumber: number;
  totalSteps: number;
  isChecking?: boolean;
  onFinish?: () => void;
  completedSteps?: number;
  totalCompleted?: number;
}

const GuidedStepPopup: React.FC<GuidedStepPopupProps> = ({
  instruction,
  isComplete,
  onNextStep,
  onPreviousStep,
  onCheckStep,
  stepNumber,
  totalSteps,
  isChecking = false,
  onFinish,
  completedSteps,
  totalCompleted,
}) => {
  // Draggable state with default bottom-left position
  const [position, setPosition] = useState({ x: 32, y: window.innerHeight - 500 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const popupRef = useRef(null);

  // Update default position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(pos => ({
        x: pos.x,
        y: Math.min(pos.y, window.innerHeight - 200)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const popup = (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: 380,
        maxWidth: '95vw',
        minHeight: 260,
        zIndex: 2147483647, // ensure above any overlay
        pointerEvents: 'auto',
        background: 'rgba(247, 236, 220, 0.95)',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        border: '1px solid #bfa074',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        animation: 'fade-in 0.3s',
        cursor: dragging ? 'grabbing' : 'default',
        transform: 'translateZ(0)'
      }}
      className="guided-step-popup animate-fade-in"
    >
      {/* Draggable handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}
        className="w-full"
      >
        <div style={{ width: 32, height: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <span className="pb-3" style={{ fontSize: 24, color: '#a67c52', letterSpacing: 2 }}>•••</span>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#e7dbc7] rounded-full mb-4 overflow-hidden relative">
        <div
          className="h-full bg-medium-coffee/70 transition-all duration-500"
          style={{ width: `${(totalSteps > 0 ? (stepNumber / totalSteps) * 100 : 0)}%` }}
        />
      </div>
      
      {/* Step Completion Summary */}
      <div className="text-center mb-3 text-base text-medium-coffee">
    
       
      </div>
      {/* Header */}
      <div className="flex items-center mb-3 gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-medium-coffee to-deep-espresso flex items-center justify-center text-light-cream font-bold text-xl shadow-lg border-2 border-light-cream/30">
          <span className='pb-0.5'>{stepNumber}</span>
        </div>
        <h3 className="font-bold text-medium-coffee text-xl tracking-wide">
          Step {stepNumber} of {totalSteps}
        </h3>
      </div>
      {/* Instruction */}
      <div className="mb-5 max-h-32 overflow-y-auto text-lg text-dark-charcoal leading-7 font-medium">
        <ReactMarkdown
          children={instruction}
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3">{children}</p>,
            code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
              inline ? (
                <code className="bg-light-cream text-medium-coffee px-2 rounded font-mono text-lg">{children}</code>
              ) : (
                <pre className="bg-light-cream p-4 rounded-lg overflow-x-auto text-lg font-mono text-medium-coffee my-3">{children}</pre>
              ),
            strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold text-deep-espresso">{children}</strong>,
            ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-6 mb-3 space-y-2">{children}</ul>,
            li: ({ children }: { children?: React.ReactNode }) => <li className="leading-loose">{children}</li>,
            h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-2xl font-bold mb-3 mt-4 text-medium-coffee">{children}</h1>,
            h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-xl font-bold mb-3 mt-3 text-medium-coffee">{children}</h2>,
            h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-lg font-semibold mb-3 mt-3 text-medium-coffee">{children}</h3>,
            blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-4 border-medium-coffee pl-5 italic text-medium-coffee mb-3 my-3 text-lg">{children}</blockquote>,
            br: () => <br />,
          }}
        />
      </div>
      {/* Buttons */}
      <div className="flex gap-2 mt-auto">
        <Button
          onClick={onPreviousStep}
          variant="outline"
          size="sm"
          className="flex-1 border-2 border-medium-coffee/50 text-medium-coffee bg-transparent hover:bg-medium-coffee/10 transition-all duration-200 rounded-lg text-lg font-semibold py-3 px-4"
          disabled={stepNumber === 1}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>

        {/* Primary action: check step or move on when complete */}
        <Button
          onClick={isComplete ? onNextStep : onCheckStep}
          variant="default"
          size="sm"
          className={`flex-1 ${isComplete ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-medium-coffee hover:bg-deep-espresso text-light-cream'} transition-all duration-200 rounded-lg text-base font-bold py-3 px-4 flex items-center justify-center shadow-md hover:shadow-lg`}
          disabled={isChecking}
        > 
          {isChecking ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Checking...
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Move to Next Step
            </>
          ) : (
            <>
              <Search className={`h-5 w-5 mr-2 ${!isComplete ? 'animate-pulse' : ''}`} />
              Check Step
            </>
          )}
        </Button>

        {stepNumber === totalSteps ? (
          <Button
            onClick={onFinish}
            size="sm"
            className={`flex-1 bg-gradient-to-r ${isComplete ? 'from-medium-coffee to-deep-espresso hover:from-deep-espresso hover:to-medium-coffee' : 'from-gray-400 to-gray-500'} text-light-cream transition-all duration-300 rounded-lg text-base font-semibold py-3 px-4 ${!isComplete && 'cursor-not-allowed'}`}
            disabled={!isComplete}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Finish
          </Button>
        ) : (
          <Button
            onClick={onNextStep}
            size="sm"
            className={`flex-1 ${isComplete ? 'bg-medium-coffee hover:bg-deep-espresso text-light-cream' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} transition-all duration-200 rounded-lg text-lg font-semibold py-3 px-4`}
            disabled={!isComplete}
          >
            <ArrowRight className="h-5 w-5 mr-2" />
            {isComplete ? 'Next' : 'Complete Step First'}
          </Button>
        )}
      </div>
    </div>
  );

  // Render via portal to avoid being hidden by parent stacking contexts/overlays
  return typeof document !== 'undefined' ? createPortal(popup, document.body) : popup;
};

export default GuidedStepPopup;
