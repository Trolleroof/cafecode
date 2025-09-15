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
          bottom: '20px',
          left: '20px',
          zIndex: 2147483647,
          width: '380px', // Fixed width
          height: '280px', // Fixed height to prevent expanding/contracting
          backgroundColor: '#f5f1eb',
          borderRadius: '12px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          border: '1px solid #d4c4a8',
          cursor: dragging ? 'grabbing' : 'grab',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
              width: '36px', 
              height: '36px', 
                borderRadius: '50%', 
              background: '#8b4513',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '18px',
              boxShadow: '0 2px 6px rgba(139, 69, 19, 0.3)',
              }}>
                {stepNumber}
              </div>
              <div>
                <h3 style={{ 
                  margin: 0, 
                fontSize: '20px', 
                fontWeight: '700', 
                color: '#2c1810',
                lineHeight: '1.2',
                }}>
                  Step {stepNumber} of {totalSteps}
                </h3>
                {completedSteps !== undefined && totalCompleted !== undefined && (
                  <p style={{ 
                    margin: '4px 0 0', 
                  fontSize: '15px', 
                  color: '#8b7355',
                  lineHeight: '1.3',
                  fontWeight: '500'
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
                color: '#34c759',
                fontSize: '14px',
                fontWeight: '600',
                padding: '4px 8px',
                backgroundColor: 'rgba(52, 199, 89, 0.15)',
                borderRadius: '8px',
                border: '1px solid rgba(52, 199, 89, 0.3)'
                }}>
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </div>
              )}
          </div>
        </div>

        {/* Content - Integrated into card */}
            <div style={{ 
          flex: 1,
          overflow: 'auto',
          marginBottom: '20px',
          fontSize: '16px', 
          lineHeight: '1.6', 
          color: '#2c1810',
          fontWeight: '400',
          userSelect: 'text',
          cursor: 'text',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
        onMouseDown={(e) => e.stopPropagation()}
        >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
              p: ({ children }) => <p style={{ margin: '0 0 12px', lineHeight: '1.6', fontSize: '16px' }}>{children}</p>,
              ul: ({ children }) => <ul style={{ margin: '0 0 12px', paddingLeft: '24px' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ margin: '0 0 12px', paddingLeft: '24px' }}>{children}</ol>,
              li: ({ children }) => <li style={{ margin: '0 0 6px', lineHeight: '1.6', fontSize: '16px' }}>{children}</li>,
                  code: ({ children, className, ...props }: any) => {
                    const isInline = !className || !className.includes('language-');
                    return isInline ? (
                      <code style={{ 
                    backgroundColor: '#f3f4f6', 
                    padding: '3px 8px', 
                        borderRadius: '4px', 
                    fontSize: '15px',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                    userSelect: 'all',
                    wordBreak: 'break-word'
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
                    fontSize: '15px',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                    margin: '12px 0',
                    userSelect: 'all'
                      }}>
                        <code>{children}</code>
                      </pre>
                    );
                  },
              strong: ({ children }) => <strong style={{ fontWeight: '600', color: '#111827', fontSize: '16px' }}>{children}</strong>,
              em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '16px' }}>{children}</em>,
                }}
              >
                {instruction}
              </ReactMarkdown>
        </div>

        {/* Footer - Fixed at bottom */}
        <div style={{ 
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
            {stepNumber > 1 && (
            <Button
              onClick={onPreviousStep}
              variant="outline"
              className="flex items-center gap-1"
              style={{ 
                borderColor: '#8b7355',
                color: '#2c1810',
                backgroundColor: '#f5f1eb',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '15px',
                fontWeight: '600',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #8b7355',
                minWidth: '80px'
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            )}
            
            <Button
              onClick={onCheckStep}
              disabled={isChecking}
            className="flex items-center gap-1"
            style={{ 
              background: isComplete 
                ? '#34c759'
                : '#8b4513',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '15px',
              fontWeight: '600',
              boxShadow: isComplete 
                ? '0 2px 6px rgba(52, 199, 89, 0.3)'
                : '0 2px 6px rgba(139, 69, 19, 0.3)',
              minWidth: '90px'
            }}
            >
              {isChecking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
            ) : isComplete ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Checked
              </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Check
                </>
              )}
            </Button>

          {stepNumber === totalSteps ? (
            onFinish ? (
              <Button
                onClick={onFinish}
                className="flex items-center gap-1"
                style={{ 
                  background: '#34c759',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '15px',
                  fontWeight: '600',
                  boxShadow: '0 2px 6px rgba(52, 199, 89, 0.3)',
                  minWidth: '80px'
                }}
              >
                <CheckCircle className="h-4 w-4" />
                Finish
              </Button>
            ) : null
          ) : (
            <Button
              onClick={onNextStep}
              disabled={false}
              className="flex items-center gap-1"
              style={{ 
                background: '#8b4513',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '15px',
                fontWeight: '600',
                boxShadow: '0 2px 6px rgba(139, 69, 19, 0.3)',
                minWidth: '80px'
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
