'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  IconPlayerPlay,
  IconMessage,
  IconSend,
  IconRefresh,
  IconCircleCheck,
  IconCode,
  IconArrowLeft,
  IconSparkles,
  IconTrophy
} from '@tabler/icons-react';
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
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

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
  titleSlug?: string;
  exampleTestcases?: string;
}

interface Problem {
  title: string;
  titleSlug: string;
  difficulty: string;
}

// API response interfaces
interface LeetCodeResponse {
  success: boolean;
  problem?: LeetCodeProblem;
  welcomeMessage?: ChatMessage;
  response?: ChatMessage;
  feedback?: any[];
  chatMessage?: ChatMessage;
  allCorrect?: boolean;
  output?: string;
  error?: string;
}

// More specific response types for when we know the fields exist
interface LeetCodeChatResponse extends LeetCodeResponse {
  response: ChatMessage;
}

interface LeetCodeAnalyzeResponse extends LeetCodeResponse {
  chatMessage: ChatMessage;
  feedback: any[];
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

// Move this to the top-level, outside of any useEffect or block
function parseLeetCodeTestCases(raw: string): { input: string; output: string }[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const cases: { input: string; output: string }[] = [];
  for (let i = 0; i < lines.length - 1; i += 2) {
    cases.push({ input: lines[i], output: lines[i + 1] });
  }
  return cases;
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

function ConstraintsSection({ constraints, followup }: { constraints: string[], followup?: string }) {
  return (
    <div className="my-6">
      <div className="font-bold text-orange-400 mb-2 text-lg tracking-tight">Constraints:</div>
      <div className="flex flex-col gap-2 mb-2">
        {constraints.map((c, i) => (
          <div key={i} className="bg-[#23272f] text-[#ffb86c] rounded-lg px-4 py-2 font-mono text-base shadow border border-orange-400/30">
            {c}
          </div>
        ))}
      </div>
      {followup && (
        <>
          <div className="font-bold text-orange-400 mt-4 mb-2 text-lg tracking-tight">Follow-up:</div>
          <div className="bg-[#23272f] text-[#ffb86c] rounded-lg px-4 py-2 font-mono text-base shadow border border-orange-400/30">{followup}</div>
        </>
      )}
    </div>
  );
}

function MarkdownProblemDescription({ description, examples }: { description: string, examples: string }) {
  return (
    <>
      <div className="text-dark-charcoal/80 leading-relaxed mb-2 whitespace-pre-line">{description.trim()}</div>
      {examples && <ExamplesBox examples={examples} />}
    </>
  );
}

// Add a new component to render structured examples
function StructuredExamples({ structured }: { structured: any }) {
  if (!structured) return null;
  return (
    <div className="mt-2 bg-cream-beige/60 rounded-xl p-6 shadow-lg">
      {structured.instructions && (
        <div className="mb-8">
          <h4 className="font-semibold text-lg text-deep-espresso mb-3 tracking-tight">Instructions</h4>
          <div className="bg-white rounded-xl p-5 border border-medium-coffee/30 text-dark-charcoal/90 shadow-sm text-base leading-relaxed">
            {structured.instructions}
          </div>
        </div>
      )}
      <h4 className="font-semibold text-lg text-deep-espresso mb-2 tracking-tight">Examples</h4>
      {structured.examples && structured.examples.length > 0 ? (
        <div className="flex flex-col">
          {structured.examples.map((ex: any, i: number) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-cream-beige shadow-md mb-4 last:mb-0">
              <div className="mb-2 text-sm text-medium-coffee font-semibold">Example {i + 1}</div>
              <div className="mb-2 flex flex-col gap-1">
                <div><span className="font-bold text-deep-espresso">Input:</span> <span className="font-mono bg-cream-beige px-2 py-1 rounded text-dark-charcoal">{ex.input}</span></div>
                <div><span className="font-bold text-deep-espresso">Output:</span> <span className="font-mono bg-cream-beige px-2 py-1 rounded text-dark-charcoal">{ex.output}</span></div>
                {ex.explanation && <div><span className="font-bold text-deep-espresso">Explanation:</span> <span className="bg-cream-beige px-2 py-1 rounded text-dark-charcoal">{ex.explanation}</span></div>}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="text-dark-charcoal/60">No examples found.</div>}
      <div className="mt-8 space-y-2">
        {structured.inputs && structured.inputs.length > 0 && (
          <div><span className="font-bold text-deep-espresso">Inputs:</span> <span className="font-mono bg-white px-2 py-1 rounded border border-cream-beige text-dark-charcoal">{structured.inputs.join(', ')}</span></div>
        )}
        {structured.outputs && structured.outputs.length > 0 && (
          <div><span className="font-bold text-deep-espresso">Outputs:</span> <span className="font-mono bg-white px-2 py-1 rounded border border-cream-beige text-dark-charcoal">{structured.outputs.join(', ')}</span></div>
        )}
      </div>
    </div>
  );
}

// Custom renderers for markdown elements
const markdownComponents = {
  code({node, inline, className, children, ...props}: any) {
    return inline ? (
      <code className="font-mono text-base text-deep-espresso" style={{background: 'none', border: 'none', padding: 0, margin: 0}} {...props}>{children}</code>
    ) : (
      <span className="font-mono text-base text-deep-espresso" style={{background: 'none', border: 'none', padding: 0, margin: 0, display: 'inline-block', whiteSpace: 'pre-wrap', verticalAlign: 'middle'}} {...props}>{children}</span>
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

// Move AdjustableOutputBox above LeetCodePage definition
function AdjustableOutputBox({ testCases, height }: { testCases: any[], height: number }) {
  if (!testCases || testCases.length === 0) {
    return (
      <div className="mb-4 px-6 pt-6">
        <div className="font-bold text-medium-coffee mb-2 text-lg">Test Cases</div>
        <div className="bg-light-cream rounded-xl border border-medium-coffee flex items-center justify-center" style={{ height, padding: 24 }}>
          <span className="text-medium-coffee font-mono text-base">No test cases yet for this problem.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-4 px-6 pt-6">
      <div className="font-bold text-medium-coffee mb-2 text-lg">Test Cases</div>
      <div className="bg-light-cream rounded-xl border border-medium-coffee overflow-auto" style={{ height, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {testCases.map((tc, i) => (
          <div key={i} className="mb-4 last:mb-0 bg-white rounded-lg shadow border border-cream-beige px-5 py-4 flex flex-col gap-2">
            <div className="font-semibold text-medium-coffee mb-1">Case {i + 1}</div>
            <div><span className="font-bold text-deep-espresso">Input:</span> <span className="font-mono bg-cream-beige px-2 py-1 rounded text-dark-charcoal">{tc.input}</span></div>
            <div><span className="font-bold text-deep-espresso">Output:</span> <span className="font-mono bg-cream-beige px-2 py-1 rounded text-dark-charcoal">{tc.output}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to get a safe field from a problem object or fallback
function getSafeField(obj: Record<string, any> | undefined, keys: string[], fallback = ''): string {
  for (const key of keys) {
    if (obj && typeof obj[key] === 'string' && obj[key].trim()) return obj[key];
  }
  return fallback;
}

function LeetCodePage() {
  const router = useRouter();
  const { session } = useAuth(); // Add this line to get authentication
  
  const [code, setCode] = useState('// Start coding your solution here\n\n');
  const [language, setLanguage] = useState('javascript');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: "Welcome to Cafécode's unofficial Leetcode Practice! 🚀\n\nDescribe a coding problem you\'d like to practice, or I can generate one for you. I\'ll break it down into step-by-step guidance to help you learn.",
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
  const [isProblemsLoading, setIsProblemsLoading] = useState(false); // <-- add this
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

  // Track which test case is active
  const [activeTestCase, setActiveTestCase] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedProblems = useRef(false);
  const resizerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [structuredProblem, setStructuredProblem] = useState<any>(null);
  const [isStructuredLoading, setIsStructuredLoading] = useState(false);

  // Add state for code editor height percentage
  const [editorHeightPercent, setEditorHeightPercent] = useState(70); // default to 70% for more code space
  const resizerBarRef = useRef<HTMLDivElement>(null);
  const isResizingEditor = useRef(false);

  // Add new state for project loading
  const [isProjectLoading, setIsProjectLoading] = useState(false);

  // Add state for isLoadingSimilar and errorSimilar
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [errorSimilar, setErrorSimilar] = useState('');

  // Handler for starting the drag
  const handleEditorResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingEditor.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Handler for dragging
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingEditor.current) return;
      const container = resizerBarRef.current?.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minEditor = 120;
      const minTestCases = 80;
      const maxEditor = rect.height - minTestCases;
      const newEditorPx = Math.max(minEditor, Math.min(y, maxEditor));
      const percent = (newEditorPx / rect.height) * 100;
      setEditorHeightPercent(percent);
    };
    const onMouseUp = () => {
      if (isResizingEditor.current) {
        isResizingEditor.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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
    if (!hasFetchedProblems.current && session?.access_token) {
      hasFetchedProblems.current = true;
      setIsProblemsLoading(true); // <-- set loading true before fetch
      console.log('Fetching LeetCode problems...');
      fetch('/api/leetcode/assigned', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
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
        })
        .finally(() => {
          setIsProblemsLoading(false); // <-- set loading false after fetch
        });
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Prevent race conditions: track the slug for which this effect is running
    let isCurrent = true;
    const slug = currentProblem?.slug;
    if (slug && session?.access_token) {
      console.log('[useEffect-testcases] currentProblem.slug changed:', slug);
      console.log('[useEffect-testcases] currentProblem:', currentProblem);
      fetch(`/api/leetcode/testcases?slug=${slug}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(async res => {
          if (!res.ok) {
            console.warn('Testcases API returned error, using empty testcases');
            return { testcases: '' };
          }
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return res.json();
          } else {
            console.warn('Testcases API returned non-JSON, using empty testcases');
            return { testcases: '' };
          }
        })
        .then(data => {
          if (!isCurrent) return; // Only update state if this is the latest slug
          setTestCaseContent(data.testcases || '');
          if (data.testcases && typeof data.testcases === 'string' && data.testcases.trim() !== '') {
            const parsed = parseLeetCodeTestCases(data.testcases);
            setTestCases(parsed);
            console.log('setTestCases (from string):', parsed);
          } else if (data.testcases && Array.isArray(data.testcases)) {
            setTestCases(data.testcases);
            console.log('setTestCases (from array):', data.testcases);
          } else if (
            (!data.testcases || data.testcases.trim() === '') &&
            currentProblem &&
            typeof currentProblem.exampleTestcases === 'string' &&
            currentProblem.exampleTestcases.trim() !== ''
          ) {
            const parsed = parseLeetCodeTestCases(currentProblem.exampleTestcases);
            setTestCases(parsed);
            console.log('setTestCases (from exampleTestcases fallback):', parsed);
          } else {
            setTestCases([]);
            console.log('setTestCases ([]): []');
          }
        })
        .catch(error => {
          if (!isCurrent) return;
          console.error('Error fetching testcases:', error);
          setTestCaseContent('');
          setTestCases([]);
          console.log('setTestCases ([]): [] (error case)');
        });
    } else {
      setTestCaseContent('');
      setTestCases([]);
      console.log('[useEffect-testcases] setTestCases ([]): [] (no slug)');
      console.log('[useEffect-testcases] currentProblem:', currentProblem);
    }
    return () => {
      isCurrent = false;
    };
  }, [currentProblem?.slug, session?.access_token]);

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
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            problemDescription: inputMessage,
            language: language
          })
        });
        if (!response.ok) throw new Error(await response.text());
        const contentType = response.headers.get('content-type');
        let data: LeetCodeResponse;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error(await response.text());
        }
        if (data.problem) {
          setCurrentProblem({
            title: data.problem.title ?? 'Untitled Problem',
            description: data.problem.description ?? '',
            difficulty: data.problem.difficulty ?? 'Medium',
            steps: data.problem.steps ?? [],
            slug: data.problem.slug ?? data.problem.titleSlug ?? 'unknown-slug',
            exampleTestcases: data.problem.exampleTestcases ?? '',
            titleSlug: data.problem.titleSlug
          });
        }
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        const assistantMessage: ChatMessage = {
          type: 'assistant',
          content: data.welcomeMessage?.content || '',
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        // This is a chat message within the context of the current problem
        const response = await fetch('/api/leetcode/chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            history: chatHistory,
            currentStepInstruction: currentProblem.steps[currentStepIndex]?.instruction,
            currentCode: code,
            currentLanguage: language
          })
        });
        if (!response.ok) throw new Error(await response.text());
        const contentType = response.headers.get('content-type');
        let data: LeetCodeResponse;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          throw new Error(await response.text());
        }
        if (data.response) {
          const responseMessage: ChatMessage = (data as LeetCodeChatResponse).response;
          setChatHistory(prev => [...prev, responseMessage]);
        }
        if (data.chatMessage) {
          const chatMessage: ChatMessage = (data as LeetCodeAnalyzeResponse).chatMessage;
          setChatHistory(prev => [...prev, chatMessage]);
        }
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
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
      let data: LeetCodeResponse;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error(await response.text());
      }
      if (data.chatMessage) {
        const chatMessage: ChatMessage = (data as LeetCodeAnalyzeResponse).chatMessage;
        setChatHistory(prev => [...prev, chatMessage]);
      }
      // Check if step is complete
      const allCorrect = data.feedback && data.feedback.every((f: any) => f.correct);
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

  const handleNewProblem = () => {
    setShowProjectModal(false);
    resetProblemState();
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
    setIsProjectLoading(true); // <-- Only set true when starting a project
    setIsStructuredLoading(true);
    setStructuredProblem({
      meta: {
        title: problem.title,
        description: '',
        difficulty: problem.difficulty,
        slug: problem.titleSlug
      },
      structured: { instructions: '', examples: '', inputs: [], outputs: [] },
      success: true
    });
    // Call backend to generate guided steps (reuse startProblem logic)
    const stepsRes = await fetch('/api/leetcode/startProblem', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
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
    setChatHistory([
      {
        type: 'assistant',
        content: 'Welcome to Cafécode Practice! 🚀\n\nDescribe a coding problem you\'d like to practice, or I can generate one for you. I\'ll break it down into step-by-step guidance to help you learn.',
        timestamp: new Date().toISOString()
      }
    ]);
    // Fallback: immediately set structuredProblem for display
    setStructuredProblem({
      meta: {
        title: stepsData.problem.title,
        description: stepsData.problem.description,
        difficulty: stepsData.problem.difficulty,
        slug: problem.titleSlug
      },
      structured: { instructions: '', examples: '', inputs: [], outputs: [] },
      success: true
    });
    // Fetch structured problem data (examples, inputs, outputs)
    try {
      const structuredRes = await fetch(`/api/leetcode/problem/${problem.titleSlug}/structured`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const structuredData = await structuredRes.json();
      if (structuredData.success && structuredData.meta && structuredData.meta.description) {
        setStructuredProblem(structuredData);
      }
    } catch (err) {
      // fallback already set
    } finally {
      setIsStructuredLoading(false);
      setIsProjectLoading(false); // <-- Set false when done
      setShowProjectModal(false); // <-- Only close after loading is done
    }
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput([]); // Clear previous output
    try {
      const response = await fetch('/api/code/run', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ code, language })
      });
      if (!response.ok) throw new Error(await response.text());
      const contentType = response.headers.get('content-type');
      let data: LeetCodeResponse;
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

  // --- Move resetProblemState here so it can access state setters ---
  function resetProblemState() {
    setCurrentProblem(null);
    setIsProjectLoading(false);
    setCurrentStepIndex(0);
    setCompletedSteps(new Set());
    setCode('// Start coding your solution here\n\n');
    setIsAutoProgressing(false);
    setOutput([]);
    setTestCases([]);
    setChatHistory([
      {
        type: 'assistant',
        content: 'Welcome to Cafécode Practice! 🚀\n\nDescribe a coding problem you\'d like to practice, or I can generate one for you. I\'ll break it down into step-by-step guidance to help you learn.',
        timestamp: new Date().toISOString()
      }
    ]);
    setSelectedProblem(null);
    setStructuredProblem(null);
    setShowProjectModal(false);
  }

  // Handler to generate a similar problem
  const handleGenerateSimilarProblem = async () => {
    if (!currentProblem) return;
    setIsLoadingSimilar(true);
    setErrorSimilar('');
    try {
      const response = await fetch('/api/leetcode/similar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          slug: currentProblem.slug,
          title: currentProblem.title,
          description: currentProblem.description,
          language: language
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      if (!data.problem) throw new Error('No problem returned');
      // Reset all problem-related state and set new problem
      setCurrentProblem({ ...data.problem, slug: data.problem.slug });
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
      setCode('// Start coding your solution here\n\n');
      setIsAutoProgressing(false);
      setOutput([]);
      setTestCases([]);
      setChatHistory([
        data.welcomeMessage || {
          type: 'assistant',
          content: 'Here is a similar problem for you to practice!',
          timestamp: new Date().toISOString()
        }
      ]);
      setSelectedProblem(null);
      setStructuredProblem(null);
      setShowProjectModal(false);
    } catch (err) {
      setErrorSimilar(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  return (
    <div className="h-screen min-h-0 bg-light-cream flex flex-col overflow-hidden relative text-dark-charcoal">
      {/* Loading Overlay */}
      {(isLoading || isStructuredLoading) && !currentProblem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-light-cream/80">
          <div className="flex flex-col items-center">
            <IconRefresh className="h-12 w-12 text-medium-coffee animate-spin mb-4" />
            <span className="text-medium-coffee text-lg font-semibold">Loading problem...</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-light-cream border-b border-cream-beige px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-1">
           <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-cream-beige">
            <IconArrowLeft className="h-5 w-5 text-deep-espresso" />
          </button>
          <div className="w-9 h-9 flex items-center justify-center">
            <img src="/images/logo-trans.png" alt="Cafécode Logo" className="h-9 w-9 object-contain rounded-xl" />
          </div>
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-xl font-bold text-deep-espresso"> 
                LeetCode Practice
              </h1>
            </div>
            {!currentProblem && (
              <Button
                onClick={() => setShowProjectModal(true)}
                className="btn-coffee-primary ml-4"
                disabled={isLoading}
              >
                <IconSparkles className="mr-2 h-4 w-4" />
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
                onClick={handleNewProblem}
                variant="outline"
                className="btn-coffee-outline"
              >
                <IconRefresh className="h-4 w-4 mr-2" />
                New Problem
              </Button>
              <Button
                onClick={handleGenerateSimilarProblem}
                disabled={isLoadingSimilar}
                className="btn-coffee-primary ml-2"
              >
                {isLoadingSimilar ? (
                  <IconRefresh className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <IconSparkles className="h-4 w-4 mr-2" />
                )}
                {isLoadingSimilar ? 'Generating...' : 'Try a Similar Problem'}
              </Button>
              {errorSimilar && (
                <span className="text-red-500 text-sm mt-2 ml-2">{errorSimilar}</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Panel - Problem Description & Steps */}
        <div ref={leftPanelRef} className="w-1/4 bg-light-cream border-r border-cream-beige flex flex-col relative">
          {currentProblem ? (
            <>
              {/* --- Top Section: Problem Header, Description, Examples, Output --- */}
              <div
                style={{ height: descSectionHeight, minHeight: 120, maxHeight: '60%' }}
                className="overflow-y-auto transition-all duration-100 border-b border-cream-beige"
              >
                <div className="p-6 pb-2 bg-cream-beige rounded-b-xl">
                  {/* Robust fallback: show title/description from any available field */}
                  <h2 className="text-2xl font-bold mb-3 text-deep-espresso">
                    {getSafeField(structuredProblem?.meta || currentProblem, ['title', 'problemTitle', 'name'], 'Untitled Problem')}
                  </h2>
                  <div className="prose max-w-none mb-6 text-deep-espresso">
                    {getSafeField(structuredProblem?.meta || currentProblem, ['description', 'problemDescription', 'desc'], 'No description available.')}
                  </div>
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
                  <IconTrophy className="h-5 w-5 mr-2" />
                  Solution Steps
                </h3>
                <div className="space-y-3">
                  {currentProblem.steps && currentProblem.steps.length > 0 ? (
                    currentProblem.steps.map((step, index) => (
                      <div
                        key={step.id || index}
                        className={`p-4 rounded-xl border transition-all duration-200 shadow-sm mb-2
                          ${index === currentStepIndex
                            ? 'border-medium-coffee bg-[#f7e7d6] shadow-lg'
                            : completedSteps.has(step.id)
                            ? 'border-green-400 bg-green-50/80 shadow'
                            : 'border-cream-beige bg-cream-beige/60 hover:bg-cream-beige/90 hover:shadow-md'}
                        `}
                        style={{ opacity: index === currentStepIndex ? 1 : 0.98 }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            completedSteps.has(step.id)
                              ? 'bg-green-400 text-white'
                              : index === currentStepIndex
                              ? 'bg-medium-coffee text-light-cream'
                              : 'bg-cream-beige text-dark-charcoal border border-medium-coffee/30'
                          }`}>
                            {completedSteps.has(step.id) ? <IconCircleCheck className="h-4 w-4" /> : index + 1}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm leading-relaxed ${
                              index === currentStepIndex ? 'text-[#9B6C46]' : completedSteps.has(step.id) ? 'text-green-700' : 'text-dark-charcoal/90'
                            }`}>
                              {step.instruction || JSON.stringify(step)}
                            </p>
                            {index === currentStepIndex && (
                              <div className="mt-3">
                                <Button
                                  onClick={handleCheckStep}
                                  disabled={isCheckingStep || isAutoProgressing}
                                  size="sm"
                                  className="btn-coffee-primary"
                                >
                                  {isCheckingStep ? (
                                    <IconRefresh className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <IconCircleCheck className="h-4 w-4 mr-2" />
                                  )}
                                  {isCheckingStep ? 'Checking...' : isAutoProgressing ? 'Progressing...' : 'Check Step'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-dark-charcoal/50 text-sm">
                        {currentProblem.steps === undefined ? 'Loading steps...' : 'No steps available'}
                      </div>
                      {/* Fallback: show raw steps if available */}
                      {Array.isArray(currentProblem.steps) && currentProblem.steps.length === 0 && (currentProblem as any)?.rawSteps && (
                        <pre className="text-xs text-gray-500 mt-2">{JSON.stringify((currentProblem as any).rawSteps, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <IconCode className="h-16 w-16 text-dark-charcoal/50 mx-auto mb-4" />
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
                <IconRefresh className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IconPlayerPlay className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run'}
            </Button>
          </div>

          {/* Monaco Editor + Test Cases Ratio Container */}
          <div style={{ height: 800, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: `0 0 ${editorHeightPercent}%`, minHeight: 0 }} className="bg-[#1E1E1E] pt-2">
              <MonacoEditor
                language={language}
                value={code}
                onChange={handleCodeChange}
                theme="vs-dark"
              />
            </div>
            {/* Resizer Bar - always visible */}
            <div
              ref={resizerBarRef}
              onMouseDown={handleEditorResizerMouseDown}
              className="h-3 flex items-center justify-center bg-cream-beige cursor-row-resize z-20"
              style={{ userSelect: 'none', borderRadius: '9999px', margin: '0 24px', position: 'relative', top: '-2px' }}
            >
              <div className="w-16 h-1.5 bg-medium-coffee rounded-full opacity-70" />
            </div>
            {/* Test Cases Panel - always visible, even if empty */}
            <div style={{ flex: `0 0 ${100 - editorHeightPercent}%`, minHeight: 0, overflow: 'auto', paddingTop: 6, paddingBottom: 6 }}>
              {testCases && testCases.length > 0 ? (
                <div className="w-full max-w-xl mx-auto mb-4 bg-gradient-to-br from-cream-beige via-[#f5e6d3] to-[#f3e0c7] border-2 border-medium-coffee rounded-3xl shadow-2xl h-full flex flex-col p-4" style={{ borderBottom: '2px solid #9B6C46' }}>
                  <div className="flex mb-2 gap-2">
                    {testCases.map((_, i) => (
                      <button
                        key={i}
                        className={`px-4 py-1 rounded-t-2xl font-mono text-lg transition-colors duration-150 shadow-sm border-b-2 ${
                          activeTestCase === i
                            ? 'bg-medium-coffee text-light-cream border-medium-coffee'
                            : 'bg-cream-beige text-dark-charcoal border-transparent hover:bg-[#e7d3b8]'
                        }`}
                        onClick={() => setActiveTestCase(i)}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl h-full overflow-auto flex-1 p-3 mt-1">
                    {Object.entries(testCases[activeTestCase]).map(([key, value]) => (
                      <div key={key} className="mb-2">
                        <div className="text-medium-coffee text-base mb-1 font-semibold">{key} =</div>
                        <div className="bg-cream-beige rounded px-3 py-2 text-base text-dark-charcoal font-mono border border-medium-coffee/20">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-xl mx-auto mb-4 bg-gradient-to-br from-cream-beige via-[#f5e6d3] to-[#f3e0c7] border-2 border-medium-coffee rounded-3xl shadow-2xl h-full flex flex-col p-4" style={{ borderBottom: '2px solid #9B6C46' }}>
                  <div className="flex items-center justify-center h-full text-medium-coffee/60 font-mono text-lg">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🧪</div>
                      <div>No test cases available</div>
                      <div className="text-sm mt-1">Please select a problem to recieve test cases </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="w-1/3 bg-light-cream border-l border-cream-beige flex flex-col h-full min-h-0">
          {/* Chat Header */}
          <div className="bg-light-cream border-b border-cream-beige px-4 py-3">
            <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-medium-coffee rounded-lg flex items-center justify-center">
                 <IconMessage className="h-5 w-5 text-light-cream" />
               </div>
              <div>
                <h3 className="text-sm font-semibold text-deep-espresso">Brewster</h3>
                <p className="text-xs text-dark-charcoal/70">Get hints, guidance, and chat with the problem</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
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
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
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
          <div className="border-t border-cream-beige p-4 bg-light-cream">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={currentProblem ? "Ask for help or hints..." : "Describe a coding problem..."}
                className="flex-1 bg-white text-dark-charcoal placeholder-dark-charcoal/50 border border-cream-beige rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
                disabled={isLoading || !currentProblem}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim() || !currentProblem}
                size="sm"
                className="btn-coffee-primary px-3"
              >
                {isLoading ? (
                  <IconRefresh className="h-4 animate-spin" />
                ) : (
                  <IconSend className="h-4 w-4" />
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
        isStartingProject={isProjectLoading}
        isProblemsLoading={isProblemsLoading} // <-- pass new prop
      />
    </div>
  );
}

// Wrap export
export default function ProtectedLeetCodePageWrapper() {
  return (
    <ProtectedRoute>
      <LeetCodePage />
    </ProtectedRoute>
  );
}