import React from 'react';
import { Button } from './ui/button';
import { CheckCircle, XCircle, Search, ArrowLeft, Loader2 } from 'lucide-react';

interface GuidedStepPopupProps {
  instruction: string;
  isComplete: boolean;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onCheckStep: () => void;
  stepNumber: number;
  totalSteps: number;
  isChecking?: boolean;
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
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 max-w-sm w-full mx-4 bg-gray-900 border border-blue-500 rounded-lg shadow-lg p-4 animate-slide-up-fast z-50">
      <div className="space-y-3">
        {/* Header */}
        <div className="text-center">
          <h3 className="font-bold text-blue-400 text-sm">
            Step {stepNumber} of {totalSteps}
          </h3>
        </div>
        
        {/* Instruction */}
        <div className="text-center">
          <p className="text-sm text-gray-300 leading-relaxed">
            {instruction}
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex justify-center space-x-2">
          <Button
            onClick={onPreviousStep}
            variant="outline"
            size="sm"
            className="border-blue-500 text-blue-400 bg-blue-50 hover:bg-blue-500 hover:text-white transition-all duration-200 font-bold px-4 shadow-sm"
            disabled={stepNumber === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Previous</span>
          </Button>
          
          <Button
            onClick={onCheckStep}
            variant="outline"
            size="sm"
            className="bg-yellow-500 border-yellow-500 text-white hover:bg-white hover:border-yellow-500 hover:text-yellow-600 transition-all duration-200 font-medium shadow-sm min-w-[90px] flex items-center justify-center"
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
            ) : (
              <Search className="mr-1 h-4 w-4" />
            )}
            {isChecking ? 'Checking...' : 'Check'}
          </Button>
          
          <Button
            onClick={onNextStep}
            disabled={!isComplete}
            size="sm"
            className="min-w-[80px]"
          >
            {isComplete ? (
              <CheckCircle className="mr-1 h-4 w-4" />
            ) : (
              <XCircle className="mr-1 h-4 w-4" />
            )}
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuidedStepPopup;