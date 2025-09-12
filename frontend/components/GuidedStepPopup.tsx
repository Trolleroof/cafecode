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
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === popupRef.current || (popupRef.current && popupRef.current.contains(e.target as Node))) {
      setDragging(true);
      const rect = popupRef.current!.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging && popupRef.current) {
        const x = e.clientX - dragOffset.x;
        const y = e.clientY - dragOffset.y;
        popupRef.current.style.left = `${x}px`;
        popupRef.current.style.top = `${y}px`;
        popupRef.current.style.transform = 'none';
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragOffset]);

  // Render via portal to avoid being hidden by parent stacking contexts/overlays
  return typeof document !== 'undefined' ? createPortal(
    <>
      {/* Dimming backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: 2147483646,
          pointerEvents: 'none',
        }}>
      </div>
      
      {/* Popup content */}
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2147483647,
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            borderRadius: '12px 12px 0 0',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                backgroundColor: isComplete ? '#10b981' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {stepNumber}
              </div>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#111827',
                  lineHeight: '1.2'
                }}>
                  Step {stepNumber} of {totalSteps}
                </h3>
                {completedSteps !== undefined && totalCompleted !== undefined && (
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: '14px', 
                    color: '#6b7280',
                    lineHeight: '1.2'
                  }}>
                    {completedSteps} of {totalCompleted} steps completed
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isComplete && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  color: '#10b981',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ 
              margin: '0 0 12px', 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#111827',
              lineHeight: '1.3'
            }}>
              Instructions:
            </h4>
            <div style={{ 
              fontSize: '15px', 
              lineHeight: '1.6', 
              color: '#374151',
              backgroundColor: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p style={{ margin: '0 0 12px', lineHeight: '1.6' }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ margin: '0 0 12px', paddingLeft: '20px' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ margin: '0 0 12px', paddingLeft: '20px' }}>{children}</ol>,
                  li: ({ children }) => <li style={{ margin: '0 0 4px', lineHeight: '1.5' }}>{children}</li>,
                  code: ({ children, className, ...props }: any) => {
                    const isInline = !className || !className.includes('language-');
                    return isInline ? (
                      <code style={{ 
                        backgroundColor: '#e5e7eb', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '14px',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                      }}>
                        {children}
                      </code>
                    ) : (
                      <pre style={{ 
                        backgroundColor: '#1f2937', 
                        color: '#f9fafb', 
                        padding: '12px', 
                        borderRadius: '6px', 
                        overflow: 'auto',
                        fontSize: '14px',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                        margin: '12px 0'
                      }}>
                        <code>{children}</code>
                      </pre>
                    );
                  },
                  strong: ({ children }) => <strong style={{ fontWeight: '600', color: '#111827' }}>{children}</strong>,
                  em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#6b7280' }}>{children}</em>,
                }}
              >
                {instruction}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 24px 20px', 
          borderTop: '1px solid #e5e7eb', 
          backgroundColor: '#f9fafb',
          borderRadius: '0 0 12px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {stepNumber > 1 && (
              <Button
                onClick={onPreviousStep}
                variant="outline"
                className="flex items-center gap-2"
                style={{ 
                  borderColor: '#d1d5db',
                  color: '#374151',
                  backgroundColor: 'white'
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
            
            <Button
              onClick={onCheckStep}
              disabled={isChecking}
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: isComplete ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none'
              }}
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Check
                </>
              )}
            </Button>
          </div>

          {stepNumber === totalSteps ? (
            onFinish ? (
              <Button
                onClick={onFinish}
                className="flex items-center gap-2"
                style={{ 
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none'
                }}
              >
                <CheckCircle className="h-4 w-4" />
                Finish Project
              </Button>
            ) : null
          ) : (
            <Button
              onClick={onNextStep}
              disabled={!isComplete}
              className={`flex-1 ${isComplete ? 'bg-medium-coffee hover:bg-deep-espresso text-light-cream' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} transition-all duration-200 rounded-lg text-lg font-semibold py-3 px-4`}
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Next
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body
  ) : null;
};

export default GuidedStepPopup;