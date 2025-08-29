import React, { useEffect, useState, useRef } from 'react';
import { Button } from './ui/button';
import { IconGripVertical, IconTrash, IconPlus } from '@tabler/icons-react';
import ProjectSetupLoader from './ProjectSetupLoader';

export interface PreviewStep {
  id: string;
  instruction: string;
  lineRanges: number[];
}

interface StepsPreviewModalProps {
  isOpen: boolean;
  steps: PreviewStep[];
  onClose: () => void;
  onReturnToChat?: () => void; // Add this new prop
  onStepsChange: (steps: PreviewStep[]) => void;
  onConfirm: () => void;
  isCleaning?: boolean;
  isStarting?: boolean;
  error?: string | null;
}

export default function StepsPreviewModal({
  isOpen,
  steps,
  onClose,
  onReturnToChat,
  onStepsChange,
  onConfirm,
  isCleaning = false,
  isStarting = false,
  error,
}: StepsPreviewModalProps) {
  const [localSteps, setLocalSteps] = useState<PreviewStep[]>(steps);
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedStep, setDraggedStep] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [addingStepIndex, setAddingStepIndex] = useState<number | null>(null);
  const [deletingStepIndex, setDeletingStepIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalSteps(steps);
  }, [steps]);

  // Add CSS keyframes for delete animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes deleteStep {
        from {
          opacity: 1;
          transform: scale(1);
          max-height: 200px;
          margin-bottom: 16px;
        }
        to {
          opacity: 0;
          transform: scale(0.95);
          max-height: 0;
          margin-bottom: 0;
        }
      }
      .animate-delete {
        animation: deleteStep 0.3s ease-out forwards;
        pointer-events: none;
      }
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const updateStepIds = (steps: PreviewStep[]) => {
    return steps.map((step, index) => ({
      ...step,
      id: String(index + 1)
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStep(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;

    const scrollThreshold = 60;
    const scrollSpeed = 3; // Slower auto-scrolling

    if (y < scrollThreshold) {
      container.scrollTop -= scrollSpeed;
    } else if (y > rect.height - scrollThreshold) {
      container.scrollTop += scrollSpeed;
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedStep === null) return;

    const newSteps = [...localSteps];
    const [draggedItem] = newSteps.splice(draggedStep, 1);
    
    const effectiveDropIndex = draggedStep < dropIndex ? dropIndex - 1 : dropIndex;

    newSteps.splice(effectiveDropIndex, 0, draggedItem);
    
    const updatedSteps = updateStepIds(newSteps);
    setLocalSteps(updatedSteps);
    onStepsChange(updatedSteps);
    setDraggedStep(null);
    setDropIndex(null);
  };
  
  const handleDragEnd = () => {
    setDraggedStep(null);
    setDropIndex(null);
  };

  // Calculate the visual position for each step during drag
  const getStepTransform = (index: number) => {
    if (draggedStep === null || dropIndex === null) return '';
    
    if (draggedStep === index) {
      // Dragged step becomes semi-transparent and slightly larger
      return 'opacity-50 scale-105';
    }
    
    // Calculate where other steps should move to make space
    if (draggedStep < dropIndex) {
      // Dragging down: steps before drop point move up, steps after move down
      if (index < draggedStep) {
        return 'transform -translate-y-4';
      } else if (index >= dropIndex) {
        return 'transform translate-y-4';
      }
    } else {
      // Dragging up: steps after drop point move down, steps before move up
      if (index > draggedStep) {
        return 'transform translate-y-4';
      } else if (index <= dropIndex) {
        return 'transform -translate-y-4';
      }
    }
    
    return '';
  };

  // Check if we should show the + icon
  const shouldShowPlusIcon = (index: number) => {
    // Don't show during drag operations
    if (draggedStep !== null) return false;
    // Only show when hovering over this specific row
    return hoveredIndex === index;
  };

  // Handle deleting a step with animation
  const handleDeleteStepWithAnimation = (index: number) => {
    setDeletingStepIndex(index);
    
    // Animate out, then delete after animation completes
    setTimeout(() => {
      handleDeleteStep(index);
      setDeletingStepIndex(null);
    }, 300);
  };

  // Handle adding a step with animation
  const handleAddStepWithAnimation = (index: number) => {
    
    // Add the step after a brief delay to show the animation
    setTimeout(() => {
      handleAddStep(index);
      
      // Auto-scroll to show the new step
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const stepElement = container.children[index] as HTMLElement;
          if (stepElement) {
            stepElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }
      }, 100);
    }, 300);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isStarting) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 99) {
            clearInterval(interval!);
            return 99;
          }
          // Use smaller increments for smoother progression
          const increment = prev < 50 ? 1.5 : prev < 80 ? 1 : 0.8;
          return Math.min(prev + increment, 99);
        });
      }, 100);
    } else {
      setProgress(0);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isStarting]);

  if (!isOpen) return null;

  const handleInstructionChange = (index: number, value: string) => {
    const updated = [...localSteps];
    updated[index] = { ...updated[index], instruction: value };
    setLocalSteps(updated);
    onStepsChange(updateStepIds(updated));
  };

  const handleAddStep = (index?: number) => {
    const newStep = { id: '', instruction: '', lineRanges: [1, 3] };
    let updated;
    if (index !== undefined) {
      updated = [...localSteps];
      updated.splice(index, 0, newStep);
    } else {
      updated = [...localSteps, newStep];
    }
    const updatedWithIds = updateStepIds(updated);
    setLocalSteps(updatedWithIds);
    onStepsChange(updatedWithIds);
  };

  const handleDeleteStep = (index: number) => {
    const updated = localSteps.filter((_, i) => i !== index);
    const updatedWithIds = updateStepIds(updated);
    setLocalSteps(updatedWithIds);
    onStepsChange(updatedWithIds);
  };

  // Handle confirm with AI generation for blank steps
  const handleConfirmWithAI = async () => {
    setIsSubmitting(true);
    
    // Check for blank steps and generate content for them
    const stepsWithAI = await Promise.all(
      localSteps.map(async (step, index) => {
        if (!step.instruction.trim()) {
          // Generate AI content for blank steps
          try {
            const response = await fetch('/api/guided/steps/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectDescription: 'Generate a step instruction',
                stepNumber: index + 1,
                context: 'This is a step in a guided project that needs an instruction.'
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.steps && result.steps[index]) {
                return { ...step, instruction: result.steps[index].instruction };
              }
            }
          } catch (error) {
            console.error('Error generating AI content for blank step:', error);
          }
          
          // Fallback for blank steps
          return { ...step, instruction: `Complete step ${index + 1} based on your project requirements.` };
        }
        return step;
      })
    );
    
    // Update local steps with AI-generated content
    setLocalSteps(stepsWithAI);
    onStepsChange(stepsWithAI);
    
    // Keep loading state for a moment to show the animation
    setTimeout(() => {
      setIsSubmitting(false);
      // Call the original onConfirm
      onConfirm();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-[#FDF8F3] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-3xl px-7 py-6 relative border border-[#E5D6C5]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-deep-espresso">Review Your Project Steps</h2>
            </div>
            {!isSubmitting && (
              <button onClick={onReturnToChat || onClose} className="bg-cream-beige hover:bg-medium-coffee/20 text-medium-coffee font-semibold px-4 py-2 rounded-lg transition-colors duration-200">
                Return to Chat
              </button>
            )}
          </div>

        {isStarting && (
          <div className="mb-4">
            <div className="w-full h-2 bg-cream-beige rounded-full overflow-hidden">
              <div className="h-full bg-medium-coffee transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-dark-charcoal/70 mt-2">Setting up your guided project...</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {isSubmitting && (
          <div className="mb-6 text-center">
            <ProjectSetupLoader isOpen={false} />
          </div>
        )}

        <div
          className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 relative group/list"
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          onDragEnd={handleDragEnd}
        >
          {!isSubmitting && localSteps.map((step, index) => (
            <div key={step.id}>
              <div
                className={`border border-[#7A5A43] rounded-2xl p-4 bg-[#7A5A43] shadow-md cursor-move transition-all duration-200 ${
                  getStepTransform(index)
                } ${
                  deletingStepIndex === index ? 'animate-delete' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconGripVertical className="text-[#F9EFE6] cursor-move" />
                    <div className="w-9 h-9 rounded-full bg-[#4A3A2A] text-[#F9EFE6] font-bold flex items-center justify-center shadow">{index + 1}</div>
                    <span className="text-[16px] text-[#F9EFE6] font-medium">Step {index + 1}</span>
                  </div>
                  <button onClick={() => handleDeleteStepWithAnimation(index)} className="text-[#F9EFE6] text-sm font-semibold hover:text-[#FFB3B3] transition-colors">
                    <IconTrash size={18} />
                  </button>
                </div>
                <textarea
                  value={step.instruction}
                  onChange={(e) => handleInstructionChange(index, e.target.value)}
                  placeholder="Describe the step instruction"
                  className="w-full bg-white text-[#2F2A25] border border-[#4A3A2A] rounded-lg px-3 py-2 text-[15px] leading-6 focus:outline-none focus:ring-2 focus:ring-[#4A3A2A] placeholder-[#8F8070]"
                  rows={3}
                />
              </div>
              <div
                className="relative h-8 flex items-center justify-center"
                onDragOver={(e) => { e.preventDefault(); setDropIndex(index + 1); }}
                onDragLeave={() => setDropIndex(null)}
                onDrop={(e) => handleDrop(e, index + 1)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {draggedStep !== null && dropIndex === index + 1 && (
                  <div className="absolute inset-0 h-1 bg-blue-400 rounded-md transition-all" />
                )}
                <div className={`w-full flex items-center justify-center transition-opacity duration-200 ${
                  shouldShowPlusIcon(index) ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="h-px w-full bg-[#7A5A43]/30 relative">
                    <button
                      onClick={() => handleAddStepWithAnimation(index + 1)}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDF8F3] p-1.5 rounded-full text-[#7A5A43] shadow-md z-10 hover:scale-110 transition-transform border border-[#7A5A43]/20"
                    >
                      <IconPlus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
      
        </div>
        
        {/* Submit and Continue button */}
        <div className="mt-6 flex justify-center">
          <Button 
            onClick={handleConfirmWithAI} 
            disabled={isStarting || isSubmitting}
            className="bg-[#7A5A43] hover:bg-[#5E462F] text-[#FDF8F3] rounded-xl px-8 py-3 text-lg font-semibold shadow-lg"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="universal-loader-dot delay-1" />
                  <span className="universal-loader-dot delay-2" />
                  <span className="universal-loader-dot delay-3" />
                </div>
                <span>Generating...</span>
              </div>
            ) : (
              'Submit and Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


