import React from 'react';
import { Button } from './ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

interface GuidedStepPopupProps {
  instruction: string;
  isComplete: boolean;
  onNextStep: () => void;
  stepNumber: number;
  totalSteps: number;
}

const GuidedStepPopup: React.FC<GuidedStepPopupProps> = ({
  instruction,
  isComplete,
  onNextStep,
  stepNumber,
  totalSteps,
}) => {
  return (
    <div className="absolute bottom-4 left-16 right-4 bg-gray-900 border border-blue-500 rounded-lg shadow-lg p-4 animate-slide-up-fast z-10">
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <h3 className="font-bold text-blue-400">Step {stepNumber} of {totalSteps}</h3>
          <p className="text-sm text-gray-300 mt-1 pr-4">{instruction}</p>
        </div>
        <Button
          onClick={onNextStep}
          disabled={!isComplete}
          className="ml-4 flex-shrink-0"
          size="sm"
        >
          {isComplete ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
          Next Step
        </Button>
      </div>
    </div>
  );
};

export default GuidedStepPopup; 