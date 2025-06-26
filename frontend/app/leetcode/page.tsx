'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  MessageSquare, 
  Send, 
  Lightbulb, 
  Wrench, 
  Code2, 
  FileText, 
  Terminal,
  Sparkles,
  User,
  Bot,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Target,
  Zap
} from 'lucide-react';
import MonacoEditor from '@/components/MonacoEditor';
import TypingIndicator from '@/components/TypingIndicator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  constraints: string[];
}

interface SolutionStep {
  line: number;
  instruction: string;
  code: string;
  explanation: string;
}

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface SimilarProblem {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export default function LeetCodePage() {
  const router = useRouter();
  
  // State management
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [userCode, setUserCode] = useState('');
  const [aiSolutionSteps, setAiSolutionSteps] = useState<SolutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: 'Welcome to LeetCode Practice! Click "Get New Problem" to start solving coding challenges with AI guidance.'
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  
  // Loading states
  const [isLoadingProblem, setIsLoadingProblem] = useState(false);
  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);
  const [isCheckingLine, setIsCheckingLine] = useState(false);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleGetNewProblem = async () => {
    setIsLoadingProblem(true);
    try {
      const response = await fetch('/api/leetcode/problem');
      const data = await response.json();
      
      if (data.success) {
        setCurrentProblem(data.problem);
        setUserCode('');
        setAiSolutionSteps([]);
        setCurrentStepIndex(0);
        setHighlightedLines([]);
        
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `New problem loaded: **${data.problem.title}**\n\nDifficulty: ${data.problem.difficulty}\n\nRead the problem description and click "Generate AI Solution" when you're ready for step-by-step guidance!`
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t fetch a new problem. Please try again.'
      }]);
    } finally {
      setIsLoadingProblem(false);
    }
  };

  const handleGenerateSolution = async () => {
    if (!currentProblem) return;
    
    setIsGeneratingSolution(true);
    try {
      const response = await fetch('/api/leetcode/generate-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: currentProblem })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAiSolutionSteps(data.solution);
        setCurrentStepIndex(0);
        
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `I've generated a step-by-step solution for **${currentProblem.title}**!\n\n**Step 1:** ${data.solution[0]?.instruction}\n\nStart coding and click "Check Current Line" when you're ready for feedback.`
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t generate a solution. Please try again.'
      }]);
    } finally {
      setIsGeneratingSolution(false);
    }
  };

  const handleCheckCurrentLine = async () => {
    if (!currentProblem || !aiSolutionSteps.length) return;
    
    setIsCheckingLine(true);
    try {
      const response = await fetch('/api/leetcode/check-code-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: currentProblem,
          userCode,
          aiSolution: aiSolutionSteps,
          currentStep: currentStepIndex
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const currentStep = aiSolutionSteps[currentStepIndex];
        
        if (data.feedback.correct) {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: `✅ **Great job!** ${data.feedback.suggestion}\n\n${currentStepIndex < aiSolutionSteps.length - 1 ? 'Ready for the next step? Click "Next Line"!' : 'Congratulations! You\'ve completed the solution!'}`
          }]);
          
          if (data.feedback.highlightLines) {
            setHighlightedLines(data.feedback.highlightLines);
          }
        } else {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: `💡 **Hint:** ${data.feedback.suggestion}\n\nTry again when you're ready!`
          }]);
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t check your code. Please try again.'
      }]);
    } finally {
      setIsCheckingLine(false);
    }
  };

  const handleNextLine = () => {
    if (currentStepIndex < aiSolutionSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setHighlightedLines([]);
      
      const nextStep = aiSolutionSteps[nextIndex];
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `**Step ${nextIndex + 1}:** ${nextStep.instruction}\n\nContinue coding and check your progress!`
      }]);
    }
  };

  const handleGenerateSimilarProblems = async () => {
    if (!currentProblem) return;
    
    setIsGeneratingSimilar(true);
    try {
      const response = await fetch('/api/leetcode/generate-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem: currentProblem })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const problemsList = data.similarProblems.map((p: SimilarProblem, index: number) => 
          `${index + 1}. **${p.title}** (${p.difficulty})\n   ${p.description}`
        ).join('\n\n');
        
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `Here are some similar problems to practice:\n\n${problemsList}\n\nWould you like me to load one of these problems?`
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t generate similar problems. Please try again.'
      }]);
    } finally {
      setIsGeneratingSimilar(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/leetcode/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: [...chatMessages, userMessage],
          currentProblem,
          userCode,
          aiSolutionSteps,
          currentStepIndex
        })
      });

      const data = await response.json();
      
      if (data.response) {
        setChatMessages(prev => [...prev, data.response]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-500';
      case 'Medium': return 'text-yellow-500';
      case 'Hard': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const currentStep = aiSolutionSteps[currentStepIndex];

  return (
    <div className="h-screen bg-[#094074] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#3c6997]">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-[#5adbff] to-[#ffdd4a] p-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Code2 className="h-6 w-6 text-[#094074]" />
          </button>
          <h1 className="text-xl font-bold text-[#5adbff]">LeetCode Practice</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleGetNewProblem}
            disabled={isLoadingProblem}
            className="bg-gradient-to-r from-[#5adbff] to-[#ffdd4a] text-[#094074] hover:opacity-90 font-semibold"
          >
            {isLoadingProblem ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Get New Problem
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Problem Description */}
          <ResizablePanel defaultSize={30} minSize={25}>
            <div className="h-full bg-[#1e1e1e] border-r border-[#3c6997]">
              <div className="p-4 border-b border-[#3c6997]">
                <h3 className="text-lg font-semibold text-[#5adbff]">Problem</h3>
              </div>
              
              <ScrollArea className="h-full p-4">
                {currentProblem ? (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-2">{currentProblem.title}</h2>
                      <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getDifficultyColor(currentProblem.difficulty)}`}>
                        {currentProblem.difficulty}
                      </span>
                    </div>
                    
                    <div className="text-gray-300">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentProblem.description}
                      </ReactMarkdown>
                    </div>
                    
                    {currentProblem.examples.map((example, index) => (
                      <div key={index} className="bg-[#2d2d30] p-3 rounded">
                        <h4 className="text-[#ffdd4a] font-semibold mb-2">Example {index + 1}:</h4>
                        <div className="text-sm text-gray-300">
                          <div><strong>Input:</strong> {example.input}</div>
                          <div><strong>Output:</strong> {example.output}</div>
                          {example.explanation && (
                            <div><strong>Explanation:</strong> {example.explanation}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {currentProblem.constraints.length > 0 && (
                      <div>
                        <h4 className="text-[#ffdd4a] font-semibold mb-2">Constraints:</h4>
                        <ul className="text-sm text-gray-300 list-disc list-inside">
                          {currentProblem.constraints.map((constraint, index) => (
                            <li key={index}>{constraint}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Target className="h-16 w-16 text-[#5adbff] opacity-50 mb-4" />
                    <p className="text-gray-400 text-lg">No problem loaded</p>
                    <p className="text-gray-500 text-sm mt-2">Click "Get New Problem" to start</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Code Editor */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full bg-[#1e1e1e]">
              <div className="flex items-center justify-between p-2 bg-[#2d2d30] border-b border-[#3c3c3c]">
                <span className="text-sm text-gray-300">Solution</span>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateSolution}
                    disabled={!currentProblem || isGeneratingSolution}
                    className="text-[#ffdd4a] hover:bg-[#3c3c3c]"
                  >
                    {isGeneratingSolution ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Generate AI Solution
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCheckCurrentLine}
                    disabled={!aiSolutionSteps.length || isCheckingLine}
                    className="text-[#5adbff] hover:bg-[#3c3c3c]"
                  >
                    {isCheckingLine ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Check Current Line
                  </Button>
                </div>
              </div>
              
              {/* Current Step Indicator */}
              {currentStep && (
                <div className="bg-[#3c6997] p-3 border-b border-[#5adbff]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[#ffdd4a] font-semibold">Step {currentStepIndex + 1} of {aiSolutionSteps.length}:</span>
                      <p className="text-white text-sm mt-1">{currentStep.instruction}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleNextLine}
                      disabled={currentStepIndex >= aiSolutionSteps.length - 1}
                      className="bg-[#5adbff] text-[#094074] hover:bg-[#ffdd4a]"
                    >
                      Next Line
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex-1">
                <MonacoEditor
                  language="javascript"
                  value={userCode}
                  onChange={(value) => setUserCode(value || '')}
                  highlightedLines={highlightedLines}
                  readOnly={false}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Chat and Actions */}
          <ResizablePanel defaultSize={30} minSize={25}>
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-[#3c6997]">
                <TabsTrigger value="chat" className="data-[state=active]:bg-[#5adbff] data-[state=active]:text-[#094074]">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="actions" className="data-[state=active]:bg-[#5adbff] data-[state=active]:text-[#094074]">
                  <Zap className="h-4 w-4 mr-2" />
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message, index) => (
                      <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className={`p-2 rounded-full ${message.type === 'user' ? 'bg-teal-700' : 'bg-[#ffdd4a]'}`}>
                            {message.type === 'user' ? (
                              <User className="h-4 w-4 text-white" />
                            ) : (
                              <Bot className="h-4 w-4 text-[#094074]" />
                            )}
                          </div>
                          <div className={`p-3 rounded-lg ${message.type === 'user' ? 'bg-teal-700 text-white' : 'bg-indigo-700 text-white'}`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code: ({ inline, children, className, ...props }) => {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return !inline && match ? (
                                    <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-3 rounded mt-2 mb-2 overflow-x-auto">
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  ) : (
                                    <code className="bg-[#1e1e1e] text-[#d4d4d4] px-1 py-0.5 rounded text-sm" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="flex items-start space-x-2">
                          <div className="p-2 rounded-full bg-[#ffdd4a]">
                            <Bot className="h-4 w-4 text-[#094074]" />
                          </div>
                          <div className="bg-indigo-700 p-3 rounded-lg">
                            <TypingIndicator />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-[#3c6997]">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Ask about the problem or solution..."
                      className="flex-1 px-3 py-2 bg-[#3c6997] border border-[#5adbff] rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5adbff]"
                      disabled={isTyping}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isTyping || !currentMessage.trim()}
                      className="bg-[#5adbff] text-[#094074] hover:bg-[#ffdd4a] px-4"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-[#5adbff] mb-4">Quick Actions</h3>
                  </div>
                  
                  <Button
                    onClick={handleGenerateSimilarProblems}
                    disabled={!currentProblem || isGeneratingSimilar}
                    className="w-full bg-[#3c6997] text-white hover:bg-[#5adbff] hover:text-[#094074]"
                  >
                    {isGeneratingSimilar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Target className="mr-2 h-4 w-4" />
                    )}
                    Generate Similar Problems
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setUserCode('');
                      setHighlightedLines([]);
                      setChatMessages(prev => [...prev, {
                        type: 'assistant',
                        content: 'Code editor cleared! Start fresh with your solution.'
                      }]);
                    }}
                    className="w-full bg-[#3c6997] text-white hover:bg-[#ff960d] hover:text-white"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Clear Code
                  </Button>
                  
                  <div className="pt-4 border-t border-[#3c6997]">
                    <h4 className="text-sm font-semibold text-[#ffdd4a] mb-2">Progress</h4>
                    {aiSolutionSteps.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-300">
                          <span>Step {currentStepIndex + 1} of {aiSolutionSteps.length}</span>
                          <span>{Math.round(((currentStepIndex + 1) / aiSolutionSteps.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-[#2d2d30] rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#5adbff] to-[#ffdd4a] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStepIndex + 1) / aiSolutionSteps.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No solution generated yet</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}