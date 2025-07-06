import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { CheckCircle, XCircle, Search, ArrowLeft, Loader2 } from 'lucide-react';
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

  return (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: 370,
        maxWidth: '95vw',
        minHeight: 180,
        zIndex: 1050,
        background: 'rgba(247, 236, 220, 0.95)',
        borderRadius: '1rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        border: '1px solid #bfa074',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        animation: 'fade-in 0.3s',
        cursor: dragging ? 'grabbing' : 'default',
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
      <div className="w-full h-2 bg-[#e7dbc7] rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-medium-coffee/70 transition-all duration-500" style={{ width: `${(stepNumber/totalSteps)*100}%` }} />
      </div>
      {/* Header */}
      <div className="flex items-center mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-medium-coffee to-deep-espresso flex items-center justify-center text-light-cream font-bold text-lg shadow-lg mr-3 border-2 border-light-cream/30">
         <span className='pb-1'>
          {stepNumber}
          </span>
        </div>
        <h3 className="font-bold text-medium-coffee text-base tracking-wide">
          Step {stepNumber} of {totalSteps}
        </h3>
      </div>
      {/* Instruction */}
      <div className="mb-6">
        <ReactMarkdown
          children={instruction}
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }: { children?: React.ReactNode }) => <p className="text-lg font-semibold text-dark-charcoal leading-relaxed mb-2">{children}</p>,
            code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
              inline ? (
                <code className="bg-light-cream text-medium-coffee px-1 rounded font-mono text-base align-middle inline-block" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</code>
              ) : (
                <span className="inline-block bg-light-cream text-medium-coffee px-1 rounded font-mono text-base align-middle" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</span>
              ),
            strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold text-deep-espresso">{children}</strong>,
            ul: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
            li: ({ children }: { children?: React.ReactNode }) => <span>{children}, </span>,
            h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-lg font-bold mb-2 mt-2 text-medium-coffee">{children}</h1>,
            h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-base font-bold mb-2 mt-2 text-medium-coffee">{children}</h2>,
            h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-semibold mb-2 mt-2 text-medium-coffee">{children}</h3>,
            blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-4 border-medium-coffee pl-4 italic text-medium-coffee mb-2">{children}</blockquote>,
            br: () => <>{' '}</>,
          }}
        />
      </div>
      {/* Buttons */}
      <div className="flex gap-3 mt-auto">
        <Button
          onClick={onPreviousStep}
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 px-2 py-1 border-medium-coffee text-medium-coffee bg-light-cream hover:bg-medium-coffee hover:text-light-cream transition-all duration-200 font-bold rounded-xl shadow-sm text-sm"
          disabled={stepNumber === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={onCheckStep}
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 px-2 py-1 bg-medium-coffee border-medium-coffee text-light-cream hover:bg-deep-espresso hover:border-deep-espresso hover:text-light-cream transition-all duration-200 font-bold shadow-sm flex items-center justify-center rounded-xl text-sm"
          disabled={isChecking}
        >
          {isChecking ? (
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {isChecking ? 'Checking...' : 'Check'}
        </Button>
        {stepNumber === totalSteps ? (
          <Button
            onClick={onFinish}
            disabled={!isComplete}
            size="lg"
            className="flex-1 min-w-0 px-2 py-1 bg-deep-espresso hover:bg-medium-coffee text-light-cream font-bold rounded-xl shadow-lg transition-all duration-200 text-sm"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Finish
          </Button>
        ) : (
          <Button
            onClick={onNextStep}
            disabled={!isComplete}
            size="lg"
            className="flex-1 min-w-0 px-2 py-1 bg-medium-coffee hover:bg-deep-espresso text-light-cream font-bold rounded-xl shadow-lg transition-all duration-200 text-sm"
          >
            {isComplete ? (
              <CheckCircle className="mr-2 h-4 w-4" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default GuidedStepPopup;