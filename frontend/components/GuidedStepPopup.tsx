import React from 'react';
import { Button } from './ui/button';
import { CheckCircle, XCircle, Search, ArrowLeft } from 'lucide-react';

interface GuidedStepPopupProps {
  instruction: string;
  isComplete: boolean;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onCheckStep: () => void;
  stepNumber: number;
  totalSteps: number;
}

const GuidedStepPopup: React.FC<GuidedStepPopupProps> = ({
  instruction,
  isComplete,
  onNextStep,
  onPreviousStep,
  onCheckStep,
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
        <div className="flex space-x-2 ml-4 flex-shrink-0">
          <Button
            onClick={onPreviousStep}
            variant="outline"
            size="sm"
            className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-200 font-medium"
            disabled={stepNumber === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={onCheckStep}
            variant="outline"
            size="sm"
            className="bg-yellow-500 border-yellow-500 text-white hover:bg-white hover:border-yellow-500 hover:text-yellow-600 transition-all duration-200 font-medium shadow-sm"
          >
            <Search className="mr-2 h-4 w-4" />
            Check Step
          </Button>
          <Button
            onClick={onNextStep}
            disabled={!isComplete}
            size="sm"
          >
            {isComplete ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
            Next Step
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuidedStepPopup;