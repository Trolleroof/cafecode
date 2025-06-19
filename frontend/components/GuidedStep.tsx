import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface Feedback {
  line: number;
  correct: boolean;
  suggestion?: string;
}

interface GuidedStepProps {
  instruction: string;
  feedback: Feedback[];
  onNextStep: () => void;
  isLastStep: boolean;
}

export default function GuidedStep({ instruction, feedback, onNextStep, isLastStep }: GuidedStepProps) {
  const allCorrect = feedback.every(f => f.correct);

  return (
    <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Current Step</h3>
        <p className="mt-2 text-gray-700">{instruction}</p>
      </div>

      {feedback.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Feedback</h4>
          <div className="space-y-2">
            {feedback.map((f, index) => (
              <div key={index} className="flex items-start space-x-2">
                {f.correct ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div>
                  <p className="text-sm text-gray-700">
                    Line {f.line}: {f.correct ? 'Correct' : 'Needs attention'}
                  </p>
                  {!f.correct && f.suggestion && (
                    <p className="text-sm text-red-600 mt-1">{f.suggestion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onNextStep}
          disabled={!allCorrect}
          className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
            allCorrect
              ? 'bg-primary-600 hover:bg-primary-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isLastStep ? 'Complete Project' : 'Next Step'}
        </button>
      </div>
    </div>
  );
} 