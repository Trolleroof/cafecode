'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PlayIcon, 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon, 
  ArrowPathIcon, 
  CheckIcon, 
  CodeBracketIcon,
  ArrowLeftIcon,
  SparklesIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { Target } from 'phosphor-react';
import { useRouter } from 'next/navigation';
import MonacoEditor from '@/components/MonacoEditor';
import { Button } from '@/components/ui/button';
import TypingIndicator from '@/components/TypingIndicator';
import LeetCodeProjectModal from '@/components/LeetCodeProjectModal';
import { OnChange } from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface LeetCodeStep {
  id: string;
  instruction: string;
  lineRanges: number[];
}

interface LeetCodeProblem {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  steps: LeetCodeStep[];
  slug?: string;
}

interface Problem {
  title: string;
  titleSlug: string;
  difficulty: string;
}

function formatExamples(raw: string): string {
  if (!raw) return '';
  let examples = raw.replace(/\r\n/g, '\n').trim();
  // Bold Input/Output/Explanation
  examples = examples.replace(/(Input:)/g, '**$1**');
  examples = examples.replace(/(Output:)/g, '**$1**');
  examples = examples.replace(/(Explanation:)/g, '**$1**');
  // Ensure code blocks for each example
  examples = examples.replace(/(Example \d+:)([\s\S]*?)(?=(Example \d+:|$))/g, (match, exLabel, exBody) => {
    // If already has code block, skip
    if (/```/.test(exBody)) return `${exLabel}${exBody}`;
    // Wrap Input/Output/Explanation in code block if not already
    return `${exLabel}\n\n\u0060\u0060\u0060\n${exBody.trim()}\n\u0060\u0060\u0060\n`;
  });
  // Separate each example with two newlines
  examples = examples.replace(/(Example \d+:)/g, '\n\n$1');
  return examples.trim();
}

function parseExamples(raw: string): { input: string; output: string; explanation?: string }[] {
  if (!raw) return [];
  // Split by 'Example' (with or without number)
  const blocks = raw.split(/Example\s*\d*:/i).map(b => b.trim()).filter(Boolean);
  // If no 'Example' found, treat the whole block as one example
  if (blocks.length === 0 && raw.trim()) return [{ input: raw.trim(), output: '', explanation: '' }];
  return blocks.map(block => {
    // Extract Input, Output, Explanation
    const inputMatch = block.match(/Input:([\s\S]*?)(Output:|Explanation:|$)/i);
    const outputMatch = block.match(/Output:([\s\S]*?)(Explanation:|$)/i);
    const explanationMatch = block.match(/Explanation:([\s\S]*)/i);
    return {
      input: inputMatch ? inputMatch[1].trim() : '',
      output: outputMatch ? outputMatch[1].trim() : '',
      explanation: explanationMatch ? explanationMatch[1].trim() : undefined,
    };
  });
}

function ExamplesBox({ examples }: { examples: string }) {
  const parsed = parseExamples(examples);
  if (!parsed.length) return null;
  return (
    <div className="bg-cream-beige border-2 border-medium-coffee rounded-xl p-4 mt-4 mb-4 shadow-sm">
      <div className="font-bold text-medium-coffee mb-2">Examples</div>
      <div className="space-y-4">
        {parsed.map((ex, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-cream-beige/60 shadow">
            <div className="font-semibold text-medium-coffee mb-1">Example {i + 1}</div>
            <div className="mb-1"><span className="font-semibold">Input:</span> <span className="font-mono bg-light-cream px-2 py-1 rounded">{ex.input || <span className="text-gray-400">(none)</span>}</span></div>
            <div className="mb-1"><span className="font-semibold">Output:</span> <span className="font-mono bg-light-cream px-2 py-1 rounded">{ex.output || <span className="text-gray-400">(none)</span>}</span></div>
            {ex.explanation && <div className="mt-1"><span className="font-semibold">Explanation:</span> <span>{ex.explanation}</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeetCodeTestCases({ testCases, height }: { testCases: any[], height: number }): JSX.Element | null {
  const [active, setActive] = useState(0);
  if (!testCases || testCases.length === 0) return null;
  return (
    <div className="bg-dark-charcoal rounded-lg text-light-cream font-mono w-full max-w-xl mx-auto mb-4" style={{ height, minHeight: 80, maxHeight: 300, overflow: 'auto' }}>
      <div className="flex mb-2">
        {testCases.map((_, i) => (
          <button
            key={i}
            className={`px-4 py-1 rounded-t pt-2 ${
              active === i
                ? 'bg-cream-beige text-dark-charcoal'
                : 'bg-dark-charcoal text-light-cream/70 border-b-2 border-medium-coffee'
            }`}
            onClick={() => setActive(i)}
          >
            Case {i + 1}
          </button>
        ))}
      </div>
      <div className="p-4 bg-cream-beige/10 rounded-b-lg">
        {Object.entries(testCases[active]).map(([key, value]) => (
          <div key={key} className="mb-4">
            <div className="text-medium-coffee text-sm mb-1">{key} =</div>
            <div className="bg-dark-charcoal rounded px-3 py-2 text-base text-light-cream font-mono border border-cream-beige/20">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdjustableOutputBox({ output, height, setHeight }: { output: string[], height: number, setHeight: (h: number) => void }) {
  const resizerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !resizerRef.current) return;
      const container = resizerRef.current.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const mouseY = e.clientY - containerRect.top;
      const minHeight = 60;
      const maxHeight = 250;
      const newHeight = Math.max(minHeight, Math.min(mouseY, maxHeight));
      setHeight(newHeight);
    };
    const handleMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setHeight]);

  return (
    <div className="mb-4">
      <div className="font-bold text-medium-coffee mb-2">Output</div>
      <div className="bg-light-cream border border-medium-coffee rounded-xl overflow-auto" style={{ height }}>
        <pre className="p-4 text-deep-espresso font-mono text-sm whitespace-pre-wrap">
          {output.length ? output.join('\n') : 'No output yet.'}
        </pre>
      </div>
      <div
        ref={resizerRef}
        onMouseDown={() => { dragging.current = true; }}
        className="h-2 bg-cream-beige cursor-row-resize hover:bg-medium-coffee/50 transition-colors rounded-b-xl"
      />
    </div>
  );
}

function MarkdownProblemDescription({ description, examples, output, outputHeight, setOutputHeight }: { description: string, examples: string, output: string[], outputHeight: number, setOutputHeight: (h: number) => void }) {
  return (
    <>
      <div className="text-dark-charcoal/80 leading-relaxed mb-2 whitespace-pre-line">{description.trim()}</div>
      {examples && <ExamplesBox examples={examples} />}
      <AdjustableOutputBox output={output} height={outputHeight} setHeight={setOutputHeight} />
    </>
  );
}

// Add a new component to render structured examples
function StructuredExamples({ structured }: { structured: any }) {
  if (!structured) return null;
  return (
    <div className="mt-6 bg-cream-beige/60 rounded-xl p-4">
      {structured.instructions && (
        <div className="mb-6">
          <h4 className="font-semibold text-medium-coffee mb-2 text-lg">Instructions</h4>
          <div className="bg-white rounded-lg p-4 border border-cream-beige text-dark-charcoal/90 whitespace-pre-line shadow-sm">
            {structured.instructions}
          </div>
        </div>
      )}
      <h4 className="font-semibold text-medium-coffee mb-4 text-lg">Examples</h4>
      {structured.examples && structured.examples.length > 0 ? (
        <div className="flex flex-col gap-6">
          {structured.examples.map((ex: any, i: number) => (
            <div key={i}>
              <div className="bg-white rounded-xl p-4 border border-cream-beige shadow-md">
                <div className="mb-2 text-sm text-dark-charcoal/70 font-semibold">Example {i + 1}</div>
                <div className="mb-1"><span className="font-bold">Input:</span> <span className="font-mono bg-cream-beige px-2 py-1 rounded">{ex.input}</span></div>
                <div className="mb-1"><span className="font-bold">Output:</span> <span className="font-mono bg-cream-beige px-2 py-1 rounded">{ex.output}</span></div>
                {ex.explanation && <div className="mt-1"><span className="font-bold">Explanation:</span> <span className="bg-cream-beige px-2 py-1 rounded">{ex.explanation}</span></div>}
              </div>
              {i < structured.examples.length - 1 && <div className="my-4 border-t border-cream-beige" />}
            </div>
          ))}
        </div>
      ) : <div className="text-dark-charcoal/60">No examples found.</div>}
      <div className="mt-6 space-y-2">
        {structured.inputs && structured.inputs.length > 0 && (
          <div><span className="font-bold">Inputs:</span> <span className="font-mono bg-white px-2 py-1 rounded border border-cream-beige">{structured.inputs.join(', ')}</span></div>
        )}
        {structured.outputs && structured.outputs.length > 0 && (
          <div><span className="font-bold">Outputs:</span> <span className="font-mono bg-white px-2 py-1 rounded border border-cream-beige">{structured.outputs.join(', ')}</span></div>
        )}
      </div>
    </div>
  );
}

// Custom renderers for markdown elements
const markdownComponents = {
  code({node, inline, className, children, ...props}: any) {
    return inline ? (
      <code className="bg-cream-beige text-dark-charcoal px-2 py-1 rounded font-mono text-base" style={{display: 'inline'}} {...props}>{children}</code>
    ) : (
      <pre className="bg-[#23272f] text-[#e6e6e6] p-3 rounded-lg overflow-x-auto my-2"><code>{children}</code></pre>
    );
  },
  em({children, ...props}: any) {
    return <em className="italic text-dark-charcoal/80" {...props}>{children}</em>;
  },
  strong({children, ...props}: any) {
    return <strong className="font-bold text-deep-espresso" {...props}>{children}</strong>;
  },
  h1({children, ...props}: any) {
    return <h1 className="text-2xl font-bold text-deep-espresso mb-2" {...props}>{children}</h1>;
  },
  h2({children, ...props}: any) {
    return <h2 className="text-xl font-bold text-deep-espresso mt-4 mb-2" {...props}>{children}</h2>;
  },
  h3({children, ...props}: any) {
    return <h3 className="text-lg font-semibold text-deep-espresso mt-3 mb-1" {...props}>{children}</h3>;
  },
  p({children, ...props}: any) {
    return <p className="mb-3 text-dark-charcoal/90" {...props}>{children}</p>;
  },
  li({children, ...props}: any) {
    return <li className="ml-6 list-disc text-dark-charcoal/90" {...props}>{children}</li>;
  },
  ul({children, ...props}: any) {
    return <ul className="mb-3 ml-4" {...props}>{children}</ul>;
  },
  img({src, alt, ...props}: any) {
    return <img src={src} alt={alt} className="my-3 rounded shadow max-w-full" {...props} />;
  },
  blockquote({children, ...props}: any) {
    return <blockquote className="border-l-4 border-[#5adbff] pl-4 italic text-dark-charcoal/80 my-2" {...props}>{children}</blockquote>;
  },
};

export default function LeetCodePage() {
  const router = useRouter();
  const [code, setCode] = useState('// Start coding your solution here\n\n');
  const [language, setLanguage] = useState('javascript');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: 'Welcome to Cafécode Practice! 🚀\n\nDescribe a coding problem you\'d like to practice, or I can generate one for you. I\'ll break it down into step-by-step guidance to help you learn.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentProblem, setCurrentProblem] = useState<LeetCodeProblem | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCheckingStep, setIsCheckingStep] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [leetcodeProblems, setLeetcodeProblems] = useState<Problem[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isAutoProgressing, setIsAutoProgressing] = useState(false);
  const [testCaseContent, setTestCaseContent] = useState('');
  const [testCaseHeight, setTestCaseHeight] = useState(120);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [outputHeight, setOutputHeight] = useState(100);
  const [descSectionHeight, setDescSectionHeight] = useState(220); // px, initial height for top section
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const leftResizerRef = useRef<HTMLDivElement>(null);
  const leftDragging = useRef(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedProblems = useRef(false);
  const resizerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [structuredProblem, setStructuredProblem] = useState<any>(null);
  const [isStructuredLoading, setIsStructuredLoading] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to prevent layout thrashing
    const scrollToBottom = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Debounce the scroll to prevent excessive calls
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [chatHistory.length, isTyping]);

  useEffect(() => {
    if (!hasFetchedProblems.current) {
      hasFetchedProblems.current = true;
      console.log('Fetching LeetCode problems...');
      fetch('/api/leetcode/assigned')
        .then(async res => {
          if (!res.ok) throw new Error(await res.text());
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          } else {
            throw new Error(await res.text());
          }
        })
        .then(data => {
          console.log('LeetCode problems loaded:', data.problems?.length || 0);
          setLeetcodeProblems(data.problems || []);
        })
        .catch(error => {
          console.error('Error fetching LeetCode problems:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (currentProblem?.slug) {
      fetch(`/api/leetcode/testcases?slug=${currentProblem.slug}`)
        .then(async res => {
          if (!res.ok) throw new Error(await res.text());
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          } else {
            throw new Error(await res.text());
          }
        })
        .then(data => {
          setTestCaseContent(data.testcases || '');
          // Parse test cases if they exist
          if (data.testcases && Array.isArray(data.testcases)) {
            setTestCases(data.testcases);
          } else {
            setTestCases([]);
          }
        });
    } else {
      setTestCaseContent('');
      setTestCases([]);
    }
  }, [currentProblem?.slug]);

  const handleCodeChange: OnChange = (value) => {
    setCode(value || '');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // If no current problem, this is a problem description request
      if (!currentProblem) {
        const response = await fetch('/api/leetcode/startProblem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemDescription: inputMessage,
            language: language
          })
        });
        if (!response.ok) throw new Error(await response.text());
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error(await response.text());
        }
        setCurrentProblem({ ...data.problem, slug: data.problem.titleSlug });
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        const assistantMessage: ChatMessage = {
          type: 'assistant',
          content: data.welcomeMessage.content,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        // This is a chat message within the context of the current problem
        const response = await fetch('/api/leetcode/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: chatHistory,
            currentStepInstruction: currentProblem.steps[currentStepIndex]?.instruction,
            currentCode: code,
            currentLanguage: language
          })
        });
        if (!response.ok) throw new Error(await response.text());
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error(await response.text());
        }
        setChatHistory(prev => [...prev, data.response]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again. ' + (error instanceof Error ? error.message : ''),
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleCheckStep = async () => {
    if (!currentProblem || !currentProblem.steps || isCheckingStep || isAutoProgressing) return;

    const currentStep = currentProblem.steps[currentStepIndex];
    if (!currentStep) return;

    // Prevent checking already completed steps
    if (completedSteps.has(currentStep.id)) return;

    setIsCheckingStep(true);

    try {
      const response = await fetch('/api/leetcode/analyzeStep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: currentStep.id,
          code: code,
          language: language,
          stepInstruction: currentStep.instruction,
          lineRanges: currentStep.lineRanges
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(await response.text());
      }
      // Add the feedback as a chat message
      setChatHistory(prev => [...prev, data.chatMessage]);
      // Check if step is complete
      const allCorrect = data.feedback.every((f: any) => f.correct);
      if (allCorrect) {
        setCompletedSteps(prev => new Set(Array.from(prev).concat(currentStep.id)));
        // Move to next step if available
        if (currentStepIndex < currentProblem.steps.length - 1) {
          setIsAutoProgressing(true);
          setTimeout(() => {
            setCurrentStepIndex(prev => prev + 1);
            setIsAutoProgressing(false);
          }, 1000);
        } else {
          // Problem completed
          const completionMessage: ChatMessage = {
            type: 'assistant',
            content: '🎉 Congratulations! You\'ve completed this LeetCode problem! Would you like to try a similar problem or work on something new?',
            timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, completionMessage]);
        }
      }
    } catch (error) {
      console.error('Error checking step:', error);
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: 'Sorry, I couldn\'t check your step. Please try again. ' + (error instanceof Error ? error.message : ''),
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsCheckingStep(false);
    }
  };

  const handleGenerateSimilarProblem = async () => {
    if (!currentProblem || isLoading) return;

    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/leetcode/generateSimilarProblem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemDescription: currentProblem.description
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(await response.text());
      }
      setCurrentProblem(data.problem);
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
      setCode('// Start coding your solution here\n\n');
      setIsAutoProgressing(false);
      setOutput([]); // Clear output
      setTestCases([]); // Clear test cases
      const assistantMessage: ChatMessage = {
        type: 'assistant',
        content: data.welcomeMessage.content,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: 'Sorry, I couldn\'t generate a similar problem. Please try again. ' + (error instanceof Error ? error.message : ''),
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleNewProblem = () => {
    setCurrentProblem(null);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setCode('// Start coding your solution here\n\n');
    setIsAutoProgressing(false);
    setOutput([]); // Clear output
    setTestCases([]); // Clear test cases
    setChatHistory([
      {
        type: 'assistant',
        content: 'Welcome to Cafécode Practice! 🚀\n\nDescribe a coding problem you\'d like to practice, or I can generate one for you. I\'ll break it down into step-by-step guidance to help you learn.',
        timestamp: new Date().toISOString()
      }
    ]);
    setSelectedProblem(null); // Reset selected problem for modal
    setStructuredProblem(null); // Reset structured problem
    setShowProjectModal(false); // Ensure modal is closed
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-400';
      case 'Medium':
        return 'text-yellow-400';
      case 'Hard':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const currentStep = currentProblem?.steps?.[currentStepIndex];
  const isStepComplete = currentStep ? completedSteps.has(currentStep.id) : false;

  const handleStartLeetCodeProject = async (problem: Problem) => {
    setSelectedProblem(problem);
    setIsStructuredLoading(true);
    setStructuredProblem(null);
    // Call backend to generate guided steps (reuse startProblem logic)
    const stepsRes = await fetch('/api/leetcode/startProblem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemDescription: problem.title,
        language: 'python',
      })
    });
    const stepsData = await stepsRes.json();
    setCurrentProblem({ ...stepsData.problem, slug: problem.titleSlug });
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setCode('// Start coding your solution here\n\n');
    setIsAutoProgressing(false);
    setOutput([]); // Clear output
    setTestCases([]); // Clear test cases initially
    setChatHistory([
      {
        type: 'assistant',
        content: stepsData.welcomeMessage.content,
        timestamp: new Date().toISOString()
      }
    ]);
    // Fetch structured problem data (examples, inputs, outputs)
    try {
      const structuredRes = await fetch(`/api/leetcode/problem/${problem.titleSlug}/structured`);
      const structuredData = await structuredRes.json();
      if (structuredData.success) {
        setStructuredProblem(structuredData);
      } else {
        setStructuredProblem(null);
      }
    } catch (err) {
      setStructuredProblem(null);
    } finally {
      setIsStructuredLoading(false);
    }
    setShowProjectModal(false); // <-- Only close after loading is done
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput([]); // Clear previous output
    try {
      const response = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });
      if (!response.ok) throw new Error(await response.text());
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(await response.text());
      }
      if (data.output) {
        // Split output into lines and filter out empty lines
        const outputLines = data.output.split('\n').filter((line: string) => line.trim());
        // Limit output to prevent infinite growth
        setOutput(outputLines.slice(-50)); // Keep only last 50 lines
      } else if (data.error) {
        setOutput([`Error: ${data.error}`]);
      } else {
        setOutput(['No output generated']);
      }
    } catch (error) {
      setOutput([`Error: ${error instanceof Error ? error.message : error}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };
  
  const handleMouseUp = () => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging.current || !resizerRef.current) return;
    
    e.preventDefault();
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      const container = resizerRef.current?.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerHeight = containerRect.height;
      
      // Calculate the new height based on mouse position relative to container
      const mouseY = e.clientY - containerRect.top;
      
      // Set constraints: minimum 80px, maximum 40% of container height or 250px
      const minHeight = 80;
      const maxHeight = Math.min(250, containerHeight * 0.4);
      
      const newHeight = Math.max(minHeight, Math.min(mouseY, maxHeight));
      
      setTestCaseHeight(newHeight);
    });
  };
  
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragging.current) {
        handleMouseUp();
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mouseleave', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleLeftMouseMove = (e: MouseEvent) => {
      if (!leftDragging.current || !leftPanelRef.current) return;
      const panelRect = leftPanelRef.current.getBoundingClientRect();
      const minHeight = 120;
      const maxHeight = Math.max(180, panelRect.height - 120);
      const mouseY = e.clientY - panelRect.top;
      const newHeight = Math.max(minHeight, Math.min(mouseY, maxHeight));
      setDescSectionHeight(newHeight);
    };
    const handleLeftMouseUp = () => { leftDragging.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', handleLeftMouseMove);
    window.addEventListener('mouseup', handleLeftMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleLeftMouseMove);
      window.removeEventListener('mouseup', handleLeftMouseUp);
    };
  }, []);

  return (
    <div className="min-h-screen max-h-screen bg-light-cream flex flex-col overflow-hidden relative text-dark-charcoal">
      {/* Loading Overlay */}
      {(isLoading || isStructuredLoading) && !currentProblem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-light-cream/80">
          <div className="flex flex-col items-center">
            <ArrowPathIcon className="h-12 w-12 text-medium-coffee animate-spin mb-4" />
            <span className="text-medium-coffee text-lg font-semibold">Loading problem...</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-light-cream border-b border-cream-beige px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
           <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-cream-beige">
            <ArrowLeftIcon className="h-5 w-5 text-deep-espresso" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-medium-coffee rounded-lg flex items-center justify-center">
               <TrophyIcon className="h-5 w-5 text-light-cream" />
             </div>
            <div>
              <h1 className="text-xl font-bold text-deep-espresso">Cafécode Practice</h1>
            </div>
            {!currentProblem && (
              <Button
                onClick={() => setShowProjectModal(true)}
                className="btn-coffee-primary ml-4"
                disabled={isLoading}
              >
                <SparklesIcon className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Solve LeetCode Problem</span>
                <span className="sm:hidden">LeetCode</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {currentProblem && (
            <>
              <Button
                onClick={handleGenerateSimilarProblem}
                disabled={isLoading}
                className="bg-medium-coffee text-light-cream border-2 border-medium-coffee rounded-xl shadow-coffee font-semibold px-6 py-2 flex items-center justify-center transition-colors duration-150 hover:bg-medium-coffee/90 focus:outline-none focus:ring-2 focus:ring-medium-coffee"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Similar Problem
              </Button>
              <Button
                onClick={handleNewProblem}
                variant="outline"
                className="btn-coffee-outline"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                New Problem
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex max-h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Panel - Problem Description & Steps */}
        <div ref={leftPanelRef} className="w-1/3 bg-light-cream border-r border-cream-beige flex flex-col relative">
          {currentProblem ? (
            <>
              {/* --- Top Section: Problem Header, Description, Examples, Output --- */}
              <div
                style={{ height: descSectionHeight, minHeight: 120, maxHeight: '60%' }}
                className="overflow-y-auto transition-all duration-100 border-b border-cream-beige"
              >
                <div className="p-6 pb-2 bg-[#181a20] rounded-b-xl">
                  {/* Render the problem title and description as readable markdown/text */}
                  {structuredProblem && structuredProblem.meta && (
                    <>
                      <h2 className="text-xl font-bold mb-3 text-white">{structuredProblem.meta.title}</h2>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={markdownComponents}
                        className="prose max-w-none mb-6 prose-invert"
                      >
                        {structuredProblem.meta.description}
                      </ReactMarkdown>
                    </>
                  )}
                </div>
              </div>
              {/* --- Draggable Resizer Bar --- */}
              <div
                ref={leftResizerRef}
                onMouseDown={() => { leftDragging.current = true; document.body.style.cursor = 'row-resize'; }}
                className="h-2 bg-cream-beige cursor-row-resize hover:bg-medium-coffee/50 transition-colors z-10"
                style={{ userSelect: 'none' }}
              />
              {/* --- Bottom Section: Steps --- */}
              <div
                className="flex-1 p-6 overflow-y-auto"
                style={{ minHeight: 120 }}
              >
                <h3 className="text-lg font-semibold text-medium-coffee mb-4 flex items-center">
                  <TrophyIcon className="h-5 w-5 mr-2" />
                  Solution Steps
                </h3>
                <div className="space-y-3">
                  {currentProblem.steps && currentProblem.steps.length > 0 ? (
                    currentProblem.steps.map((step, index) => {
                      const isCompleted = completedSteps.has(step.id);
                      const isCurrent = index === currentStepIndex;
                      return (
                        <div
                          key={step.id}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            isCurrent
                              ? 'border-medium-coffee bg-medium-coffee/10'
                              : isCompleted
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-cream-beige bg-cream-beige/20'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isCompleted
                                ? 'bg-green-500 text-white'
                                : isCurrent
                                ? 'bg-medium-coffee text-light-cream'
                                : 'bg-cream-beige text-dark-charcoal'
                            }`}>
                              {isCompleted ? <CheckIcon className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm leading-relaxed ${
                                isCurrent ? 'text-[#9B6C46]' : isCompleted ? 'text-gray-300' : 'text-[#5adbff]/80'
                              }`}>
                                {step.instruction}
                              </p>
                              {isCurrent && (
                                <div className="mt-3">
                                  <Button
                                    onClick={handleCheckStep}
                                    disabled={isCheckingStep || isAutoProgressing}
                                    size="sm"
                                    className="btn-coffee-primary"
                                  >
                                    {isCheckingStep ? (
                                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <CheckIcon className="h-4 w-4 mr-2" />
                                    )}
                                    {isCheckingStep ? 'Checking...' : isAutoProgressing ? 'Progressing...' : 'Check Step'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-dark-charcoal/50 text-sm">
                        {currentProblem.steps === undefined ? 'Loading steps...' : 'No steps available'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <CodeBracketIcon className="h-16 w-16 text-dark-charcoal/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-deep-espresso mb-2">Ready to Practice?</h3>
                <p className="text-dark-charcoal/70 text-sm">
                  Describe a coding problem in the chat to get started with step-by-step guidance.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Middle Panel - Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Header */}
          <div className="bg-light-cream border-b border-cream-beige px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-sm font-semibold text-deep-espresso">Code Editor</h3>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-cream-beige text-dark-charcoal border border-medium-coffee/30 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-medium-coffee"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            {/* Run Button at top right */}
            <Button
              onClick={handleRunCode}
              disabled={isRunning}
              className="btn-coffee-primary"
            >
              {isRunning ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlayIcon className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run'}
            </Button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 pt-2 bg-[#1E1E1E]">
            <MonacoEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
            />
          </div>

          {/* Resizer */}
          {testCases && testCases.length > 0 && (
            <>
              <div
                ref={resizerRef}
                onMouseDown={handleMouseDown}
                className="h-2 bg-cream-beige cursor-row-resize hover:bg-medium-coffee/50 transition-colors"
              />

              {/* Test Case Viewer */}
              <LeetCodeTestCases testCases={testCases} height={testCaseHeight} />
            </>
          )}
        </div>

        {/* Right Panel - Chat */}
        <div className="w-1/3 bg-light-cream border-l border-cream-beige flex flex-col">
          {/* Chat Header */}
          <div className="bg-light-cream border-b border-cream-beige px-4 py-3">
            <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-medium-coffee rounded-lg flex items-center justify-center">
                 <ChatBubbleLeftRightIcon className="h-5 w-5 text-light-cream" />
               </div>
              <div>
                <h3 className="text-sm font-semibold text-deep-espresso">AI Assistant</h3>
                <p className="text-xs text-dark-charcoal/70">Get hints and guidance</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-200px)]">
            {chatHistory.map((message, index) => (
              <div
                key={`${message.timestamp}-${index}`}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-medium-coffee text-light-cream'
                      : 'bg-white text-dark-charcoal shadow'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-dark-charcoal p-3 rounded-lg shadow">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-cream-beige p-4">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={currentProblem ? "Ask for help or hints..." : "Describe a coding problem..."}
                className="flex-1 bg-white text-dark-charcoal placeholder-dark-charcoal/50 border border-cream-beige rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-medium-coffee"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                size="sm"
                className="btn-coffee-primary px-3"
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <LeetCodeProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        problems={leetcodeProblems}
        onSubmit={handleStartLeetCodeProject}
        isStartingProject={isLoading && !currentProblem}
      />
    </div>
  );
}