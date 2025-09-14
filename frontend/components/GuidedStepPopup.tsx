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
      {/* Popup content */}
      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2147483647,
          width: '80%',
          maxWidth: '500px',
          maxHeight: '70vh',
          overflow: 'auto',
          backgroundColor: '#F3E4D4',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
          border: '1px solid #A36A3E',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px 12px',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%', 
                backgroundColor: '#A36A3E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F3E4D4',
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                {stepNumber}
              </div>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#2F2A25',
                  lineHeight: '1.2'
                }}>
                  Step {stepNumber} of {totalSteps}
                </h3>
                {completedSteps !== undefined && totalCompleted !== undefined && (
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: '12px', 
                    color: '#2F2A25',
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
                  color: '#2F2A25',
                  fontSize: '12px',
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
        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              lineHeight: '1.5', 
              color: '#2F2A25'
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
          padding: '12px 20px 16px', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {stepNumber > 1 && (
            <Button
              onClick={onPreviousStep}
              variant="outline"
              className="flex items-center gap-2"
              style={{ 
                borderColor: '#A36A3E',
                color: '#2F2A25',
                backgroundColor: '#F3E4D4'
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
                backgroundColor: '#A36A3E',
                color: '#F3E4D4',
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
                  backgroundColor: '#A36A3E',
                  color: '#F3E4D4',
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
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: !isComplete ? '#D1D5DB' : '#A36A3E',
                color: !isComplete ? '#6B7280' : '#F3E4D4',
                border: 'none'
              }}
            >
              <ArrowRight className="h-4 w-4" />
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