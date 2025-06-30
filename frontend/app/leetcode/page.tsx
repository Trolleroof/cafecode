'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  MessageSquare, 
  Send, 
  Lightbulb, 
  RotateCcw, 
  CheckCircle, 
  Code2,
  Loader2,
  ArrowLeft,
  Sparkles,
  Target,
  Trophy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import MonacoEditor from '@/components/MonacoEditor';
import { Button } from '@/components/ui/button';
import TypingIndicator from '@/components/TypingIndicator';
import LeetCodeProjectModal from '@/components/LeetCodeProjectModal';

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

function LeetCodeTestCases({ testCases, height }: { testCases: any[], height: number }): JSX.Element | null {
  const [active, setActive] = useState(0);
  if (!testCases || testCases.length === 0) return null;
  return (
    <div className="bg-[#18181a] rounded-lg text-white font-mono w-full max-w-xl mx-auto mb-4" style={{ height, minHeight: 80, maxHeight: 300, overflow: 'auto' }}>
      <div className="flex mb-2">
        {testCases.map((_, i) => (
          <button
            key={i}
            className={`px-4 py-1 rounded-t pt-2 ${
              active === i
                ? 'bg-[#232324] text-white'
                : 'bg-[#18181a] text-gray-400 border-b-2 border-[#ffdd4a]'
            }`}
            onClick={() => setActive(i)}
          >
            Case {i + 1}
          </button>
        ))}
      </div>
      <div className="p-4 bg-[#232324] rounded-b-lg">
        {Object.entries(testCases[active]).map(([key, value]) => (
          <div key={key} className="mb-4">
            <div className="text-[#ffdd4a] text-sm mb-1">{key} =</div>
            <div className="bg-[#232324] rounded px-3 py-2 text-base text-white font-mono border border-[#232324]">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeetCodePage() {
  const router = useRouter();
  const [code, setCode] = useState('// Start coding your solution here\n\n');
  const [language, setLanguage] = useState('javascript');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: 'Welcome to LeetCode Practice! 🚀\n\nDescribe a coding problem you\'d like to practice, or I can generate one for you. I\'ll break it down into step-by-step guidance to help you learn.',
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFetchedProblems = useRef(false);
  const resizerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

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
        .then(res => res.json())
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
        .then(res => res.json())
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

        if (response.ok) {
          const data = await response.json();
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
          throw new Error('Failed to start problem');
        }
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

        if (response.ok) {
          const data = await response.json();
          setChatHistory(prev => [...prev, data.response]);
        } else {
          throw new Error('Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
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

      if (response.ok) {
        const data = await response.json();
        
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
      } else {
        throw new Error('Failed to check step');
      }
    } catch (error) {
      console.error('Error checking step:', error);
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: 'Sorry, I couldn\'t check your step. Please try again.',
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

      if (response.ok) {
        const data = await response.json();
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
      } else {
        throw new Error('Failed to generate similar problem');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        type: 'assistant',
        content: 'Sorry, I couldn\'t generate a similar problem. Please try again.',
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
        content: 'Welcome to LeetCode Practice! 🚀\n\nDescribe a coding problem you\'d like to practice, or I can generate one for you. I\'ll break it down into step-by-step guidance to help you learn.',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const currentStep = currentProblem?.steps?.[currentStepIndex];
  const isStepComplete = currentStep ? completedSteps.has(currentStep.id) : false;

  const handleStartLeetCodeProject = async (problem: Problem) => {
    setSelectedProblem(problem);
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
      
      const data = await response.json();
      
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
      setOutput([`Error: ${error}`]);
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

  return (
    <div className="min-h-screen max-h-screen bg-gradient-to-br from-[#094074] to-[#3c6997] flex flex-col overflow-hidden relative">
      {/* Loading Overlay */}
      {isLoading && !currentProblem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#094074]/80">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-[#ffdd4a] animate-spin mb-4" />
            <span className="text-[#ffdd4a] text-lg font-semibold">Loading problem...</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-[#094074] border-b border-[#3c6997] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            size="sm"
            className="text-[#5adbff] hover:bg-[#3c6997] hover:text-[#ffdd4a]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-[#5adbff] to-[#ffdd4a] p-2 rounded-lg">
              <Target className="h-6 w-6 text-[#094074]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#5adbff]">LeetCode Practice</h1>
              <p className="text-sm text-[#5adbff]/70">Master coding interviews step by step</p>
            </div>
            {!currentProblem && (
              <Button
                onClick={() => setShowProjectModal(true)}
                className="bg-[#ff960d] hover:bg-[#ffdd4a] text-white hover:text-[#094074] font-semibold shadow-lg transition-all duration-300 transform hover:scale-105 ml-4"
                disabled={isLoading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
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
                className="bg-[#ffdd4a] text-[#094074] hover:bg-[#ff960d] hover:text-white font-semibold"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Similar Problem
              </Button>
              <Button
                onClick={handleNewProblem}
                variant="outline"
                className="border-[#5adbff] text-[#5adbff] hover:bg-[#5adbff] hover:text-[#094074]"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                New Problem
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex max-h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Panel - Problem Description & Steps */}
        <div className="w-1/3 bg-[#094074] border-r border-[#3c6997] flex flex-col">
          {currentProblem ? (
            <>
              {/* Problem Header */}
              <div className="p-6 border-b border-[#3c6997]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#5adbff]">{currentProblem.title}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(currentProblem.difficulty)}`}>
                    {currentProblem.difficulty}
                  </span>
                </div>
                <p className="text-[#5adbff]/80 text-sm leading-relaxed">{currentProblem.description}</p>
              </div>

              {/* Steps */}
              <div className="flex-1 p-6 overflow-y-auto">
                <h3 className="text-lg font-semibold text-[#ffdd4a] mb-4 flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
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
                              ? 'border-[#ffdd4a] bg-[#ffdd4a]/10'
                              : isCompleted
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-[#3c6997] bg-[#3c6997]/20'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isCompleted
                                ? 'bg-green-500 text-white'
                                : isCurrent
                                ? 'bg-[#ffdd4a] text-[#094074]'
                                : 'bg-[#3c6997] text-[#5adbff]'
                            }`}>
                              {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm leading-relaxed ${
                                isCurrent ? 'text-[#ffdd4a]' : isCompleted ? 'text-green-400' : 'text-[#5adbff]/80'
                              }`}>
                                {step.instruction}
                              </p>
                              {isCurrent && (
                                <div className="mt-3">
                                  <Button
                                    onClick={handleCheckStep}
                                    disabled={isCheckingStep || isAutoProgressing}
                                    size="sm"
                                    className="bg-[#5adbff] text-[#094074] hover:bg-[#ffdd4a] hover:text-[#094074] font-semibold"
                                  >
                                    {isCheckingStep ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 mr-2" />
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
                      <div className="text-[#5adbff]/50 text-sm">
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
                <Code2 className="h-16 w-16 text-[#5adbff]/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#5adbff] mb-2">Ready to Practice?</h3>
                <p className="text-[#5adbff]/70 text-sm">
                  Describe a coding problem in the chat to get started with step-by-step guidance.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Middle Panel - Code Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Header */}
          <div className="bg-[#094074] border-b border-[#3c6997] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-sm font-semibold text-[#5adbff]">Code Editor</h3>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#3c6997] text-[#5adbff] border border-[#5adbff]/30 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#5adbff]"
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
              className="bg-[#5adbff] text-[#094074] hover:bg-[#ffdd4a] hover:text-[#094074] font-semibold px-4 py-2 rounded shadow disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run'}
            </Button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <MonacoEditor
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              highlightedLines={currentStep ? currentStep.lineRanges : []}
            />
          </div>

          {/* Resizer */}
          {testCases && testCases.length > 0 && (
            <>
              <div
                ref={resizerRef}
                onMouseDown={handleMouseDown}
                style={{ height: 8, cursor: 'row-resize', background: '#232324', margin: '0 -16px', borderTop: '1px solid #3c6997', borderBottom: '1px solid #3c6997' }}
              />

              {/* Test Case Viewer */}
              <LeetCodeTestCases testCases={testCases} height={testCaseHeight} />
            </>
          )}
        </div>

        {/* Right Panel - Chat */}
        <div className="w-1/3 bg-[#094074] border-l border-[#3c6997] flex flex-col">
          {/* Chat Header */}
          <div className="bg-[#094074] border-b border-[#3c6997] px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-[#5adbff] to-[#ffdd4a] p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-[#094074]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#5adbff]">AI Assistant</h3>
                <p className="text-xs text-[#5adbff]/70">Get hints and guidance</p>
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
                      ? 'bg-[#5adbff] text-[#094074]'
                      : 'bg-[#3c6997] text-[#5adbff]'
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
                <div className="bg-[#3c6997] text-[#5adbff] p-3 rounded-lg">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="border-t border-[#3c6997] p-4">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={currentProblem ? "Ask for help or hints..." : "Describe a coding problem..."}
                className="flex-1 bg-[#3c6997] text-[#5adbff] placeholder-[#5adbff]/50 border border-[#5adbff]/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5adbff]"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                size="sm"
                className="bg-[#5adbff] text-[#094074] hover:bg-[#ffdd4a] hover:text-[#094074] px-3"
              >
                {isLoading ? (
                  <Loader2 className="h-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <LeetCodeProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleStartLeetCodeProject}
        isStartingProject={isLoading}
        problems={leetcodeProblems}
      />
    </div>
  );
}