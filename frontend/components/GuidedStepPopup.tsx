import React from 'react';
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
  return (
    <div className="fixed bottom-8 left-8 z-50 w-[400px] max-w-[95vw] bg-white/95 backdrop-blur-lg border-2 border-blue-200 rounded-2xl shadow-2xl p-6 flex flex-col justify-between min-h-[200px] animate-fade-in">
      {/* Progress Bar */}
      <div className="w-full h-3 bg-blue-100 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full shadow-sm" 
          style={{ width: `${(stepNumber/totalSteps)*100}%` }} 
        />
      </div>

      {/* Header */}
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg mr-4 border-2 border-white/50">
          {stepNumber}
        </div>
        <h3 className="font-bold text-blue-600 text-lg tracking-wide">
          Step {stepNumber} of {totalSteps}
        </h3>
      </div>

      {/* Instruction */}
      <div className="mb-6 flex-1">
        <ReactMarkdown
          children={instruction}
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }: { children: React.ReactNode }) => (
              <p className="text-lg font-semibold text-gray-800 leading-relaxed mb-3">{children}</p>
            ),
            code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) =>
              inline ? (
                <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-mono text-base font-semibold border border-blue-200">
                  {children}
                </code>
              ) : (
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-gray-700 my-3">
                  <code>{children}</code>
                </pre>
              ),
            strong: ({ children }: { children: React.ReactNode }) => (
              <strong className="font-bold text-gray-900">{children}</strong>
            ),
            ul: ({ children }: { children: React.ReactNode }) => (
              <ul className="list-disc list-inside space-y-1 text-gray-700">{children}</ul>
            ),
            li: ({ children }: { children: React.ReactNode }) => (
              <li className="text-lg">{children}</li>
            ),
            h1: ({ children }: { children: React.ReactNode }) => (
              <h1 className="text-xl font-bold mb-3 mt-2 text-gray-900">{children}</h1>
            ),
            h2: ({ children }: { children: React.ReactNode }) => (
              <h2 className="text-lg font-bold mb-2 mt-2 text-gray-800">{children}</h2>
            ),
            h3: ({ children }: { children: React.ReactNode }) => (
              <h3 className="text-base font-semibold mb-2 mt-2 text-gray-700">{children}</h3>
            ),
            blockquote: ({ children }: { children: React.ReactNode }) => (
              <blockquote className="border-l-4 border-blue-400 pl-4 italic text-blue-700 mb-2 bg-blue-50 py-2 rounded-r-md">
                {children}
              </blockquote>
            ),
            br: () => <span className="inline-block w-2" />,
          }}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mt-auto">
        <Button
          onClick={onPreviousStep}
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 px-3 py-3 border-2 border-blue-300 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 font-bold rounded-xl shadow-sm text-base"
          disabled={stepNumber === 1}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={onCheckStep}
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 px-3 py-3 bg-yellow-400 border-2 border-yellow-500 text-yellow-900 hover:bg-yellow-300 hover:border-yellow-600 transition-all duration-200 font-bold shadow-md flex items-center justify-center rounded-xl text-base"
          disabled={isChecking}
        >
          {isChecking ? (
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
          ) : (
            <Search className="mr-2 h-5 w-5" />
          )}
          {isChecking ? 'Checking...' : 'Check'}
        </Button>
        
        {stepNumber === totalSteps ? (
          <Button
            onClick={onFinish}
            disabled={!isComplete}
            size="lg"
            className="flex-1 min-w-0 px-3 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition-all duration-200 text-base border-2 border-green-600"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Finish
          </Button>
        ) : (
          <Button
            onClick={onNextStep}
            disabled={!isComplete}
            size="lg"
            className="flex-1 min-w-0 px-3 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all duration-200 text-base border-2 border-blue-600"
          >
            {isComplete ? (
              <CheckCircle className="mr-2 h-5 w-5" />
            ) : (
              <XCircle className="mr-2 h-5 w-5" />
            )}
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default GuidedStepPopup;