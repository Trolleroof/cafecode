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
    <div className="fixed bottom-8 left-8 z-50 w-[370px] max-w-[95vw] bg-white/10 backdrop-blur-md border border-blue-400 rounded-2xl shadow-2xl p-6 flex flex-col justify-between min-h-[180px] animate-fade-in">
      {/* Progress Bar */}
      <div className="w-full h-2 bg-blue-100 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500" style={{ width: `${(stepNumber/totalSteps)*100}%` }} />
      </div>
      {/* Header */}
      <div className="flex items-center mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg mr-3 border-2 border-white/30">
          {stepNumber}
        </div>
        <h3 className="font-bold text-blue-500 text-base tracking-wide">
          Step {stepNumber} of {totalSteps}
        </h3>
      </div>
      {/* Instruction */}
      <div className="mb-6">
        <ReactMarkdown
          children={instruction}
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }: { children: React.ReactNode }) => <p className="text-lg font-semibold text-white leading-relaxed drop-shadow mb-2">{children}</p>,
            code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) =>
              inline ? (
                <code className="bg-[#06224a] text-[#5adbff] px-1 rounded font-mono text-base align-middle inline-block" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</code>
              ) : (
                <span className="inline-block bg-[#06224a] text-[#5adbff] px-1 rounded font-mono text-base align-middle" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</span>
              ),
            strong: ({ children }: { children: React.ReactNode }) => <strong className="font-bold text-white">{children}</strong>,
            ul: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
            li: ({ children }: { children: React.ReactNode }) => <span>{children}, </span>,
            h1: ({ children }: { children: React.ReactNode }) => <h1 className="text-lg font-bold mb-2 mt-2">{children}</h1>,
            h2: ({ children }: { children: React.ReactNode }) => <h2 className="text-base font-bold mb-2 mt-2">{children}</h2>,
            h3: ({ children }: { children: React.ReactNode }) => <h3 className="text-base font-semibold mb-2 mt-2">{children}</h3>,
            blockquote: ({ children }: { children: React.ReactNode }) => <blockquote className="border-l-4 border-[#5adbff] pl-4 italic text-[#5adbff] mb-2">{children}</blockquote>,
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
          className="flex-1 min-w-0 px-0 py-2 border-blue-400 text-blue-400 bg-white/20 hover:bg-blue-400 hover:text-white transition-all duration-200 font-bold rounded-xl shadow-sm text-base"
          disabled={stepNumber === 1}
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Previous
        </Button>
        <Button
          onClick={onCheckStep}
          variant="outline"
          size="lg"
          className="flex-1 min-w-0 px-0 py-2 bg-yellow-400 border-yellow-400 text-blue-900 hover:bg-white hover:border-yellow-400 hover:text-yellow-600 transition-all duration-200 font-bold shadow-sm flex items-center justify-center rounded-xl text-base"
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
            className="flex-1 min-w-0 px-0 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition-all duration-200 text-base"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Finish
          </Button>
        ) : (
          <Button
            onClick={onNextStep}
            disabled={!isComplete}
            size="lg"
            className="flex-1 min-w-0 px-0 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition-all duration-200 text-base"
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