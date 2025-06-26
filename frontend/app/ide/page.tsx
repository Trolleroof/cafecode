'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Play, MessageSquare, Lightbulb, Zap, RotateCcw, BookOpen, Send, User, Bot, Loader2 } from 'lucide-react';
import FileExplorer from '@/components/FileExplorer';
import MonacoEditor from '@/components/MonacoEditor';
import HTMLPreview from '@/components/HTMLPreview';
import RunDropdown from '@/components/RunDropdown';
import TypingIndicator from '@/components/TypingIndicator';
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GuidedStepPopup from '@/components/GuidedStepPopup';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
}

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface GuidedProject {
  projectId: string;
  steps: Array<{
    id: string;
    instruction: string;
    lineRanges: number[];
  }>;
  currentStep: number;
  description: string;
}

interface StepFeedback {
  line: number;
  correct: boolean;
  suggestion: string;
}

export default function IDEPage() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: 'Welcome to CodeCraft IDE! I\'m here to help you learn to code. You can:\n\n• Write code in the editor\n• Ask me questions about programming\n• Start a guided project for step-by-step learning\n• Get help fixing errors\n\nWhat would you like to work on today?'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const [guidedProject, setGuidedProject] = useState<GuidedProject | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isStartingProject, setIsStartingProject] = useState(false);
  const [stepFeedback, setStepFeedback] = useState<StepFeedback[]>([]);
  const [isCheckingStep, setIsCheckingStep] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js': return 'javascript';
      case 'py': return 'python';
      case 'html': return 'html';
      case 'css': return 'css';
      default: return 'plaintext';
    }
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file);
      setHighlightedLines([]);
    }
  };

  const handleFileCreate = (parentId: string | null, type: 'file' | 'folder', name: string) => {
    const newNode: FileNode = {
      id: generateId(),
      name,
      type,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
      language: type === 'file' ? getLanguageFromFileName(name) : undefined,
    };

    if (parentId === null) {
      setFiles(prev => [...prev, newNode]);
    } else {
      setFiles(prev => updateFileTree(prev, parentId, newNode));
    }

    if (type === 'file') {
      setSelectedFile(newNode);
    }
  };

  const updateFileTree = (files: FileNode[], parentId: string, newNode: FileNode): FileNode[] => {
    return files.map(file => {
      if (file.id === parentId && file.type === 'folder') {
        return {
          ...file,
          children: [...(file.children || []), newNode]
        };
      } else if (file.children) {
        return {
          ...file,
          children: updateFileTree(file.children, parentId, newNode)
        };
      }
      return file;
    });
  };

  const handleFileDelete = (fileId: string) => {
    const deleteFromTree = (files: FileNode[]): FileNode[] => {
      return files.filter(file => {
        if (file.id === fileId) {
          if (selectedFile?.id === fileId) {
            setSelectedFile(null);
          }
          return false;
        }
        if (file.children) {
          file.children = deleteFromTree(file.children);
        }
        return true;
      });
    };

    setFiles(prev => deleteFromTree(prev));
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      const updatedFile = { ...selectedFile, content: value };
      setSelectedFile(updatedFile);
      
      const updateFileContent = (files: FileNode[]): FileNode[] => {
        return files.map(file => {
          if (file.id === selectedFile.id) {
            return updatedFile;
          } else if (file.children) {
            return { ...file, children: updateFileContent(file.children) };
          }
          return file;
        });
      };

      setFiles(prev => updateFileContent(prev));
    }
  };

  const handleRunFile = async (file: FileNode) => {
    if (!file.content) return;

    setIsRunning(true);
    setOutput('Running...');

    try {
      if (file.language === 'python') {
        const response = await fetch('/api/python/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: file.content }),
        });

        const result = await response.json();
        setOutput(result.output || result.error || 'No output');
      } else if (file.language === 'html') {
        setOutput('HTML file is being previewed in the preview panel.');
      } else {
        setOutput(`Running ${file.language} files is not yet supported.`);
      }
    } catch (error) {
      setOutput(`Error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, { ...message, timestamp: Date.now() }]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    addChatMessage({ type: 'user', content: userMessage });
    setIsTyping(true);

    try {
      const endpoint = guidedProject ? '/api/guided/project-chat' : '/api/guided/simple-chat';
      const requestBody = guidedProject 
        ? {
            projectId: guidedProject.projectId,
            currentStep: guidedProject.currentStep,
            history: chatMessages,
            projectFiles: files
          }
        : {
            history: chatMessages,
            projectFiles: files,
            guidedProject,
            currentCode: selectedFile?.content,
            currentLanguage: selectedFile?.language
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (data.response) {
        addChatMessage(data.response);
      } else {
        addChatMessage({
          type: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        });
      }
    } catch (error) {
      addChatMessage({
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleStartGuidedProject = async (description: string) => {
    setIsStartingProject(true);
    try {
      const response = await fetch('/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectDescription: description,
          projectFiles: files 
        }),
      });

      const data = await response.json();
      
      if (data.projectId && data.steps) {
        setGuidedProject({
          projectId: data.projectId,
          steps: data.steps,
          currentStep: 0,
          description
        });
        
        if (data.welcomeMessage) {
          addChatMessage(data.welcomeMessage);
        }
        
        setCompletedSteps(new Set());
      }
    } catch (error) {
      console.error('Error starting guided project:', error);
    } finally {
      setIsStartingProject(false);
      setShowProjectModal(false);
    }
  };

  const handleCheckStep = async () => {
    if (!guidedProject || !selectedFile) return;

    setIsCheckingStep(true);
    const currentStep = guidedProject.steps[guidedProject.currentStep];

    try {
      const response = await fetch('/api/guided/analyzeStep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guidedProject.projectId,
          stepId: currentStep.id,
          code: selectedFile.content || '',
          language: selectedFile.language || 'plaintext',
          projectFiles: files
        }),
      });

      const data = await response.json();
      
      if (data.feedback) {
        setStepFeedback(data.feedback);
        const allCorrect = data.feedback.every((f: StepFeedback) => f.correct);
        
        if (allCorrect) {
          setCompletedSteps(prev => new Set([...prev, currentStep.id]));
        }
        
        // Highlight lines with issues
        const problematicLines = data.feedback
          .filter((f: StepFeedback) => !f.correct)
          .map((f: StepFeedback) => f.line);
        setHighlightedLines(problematicLines);
      }
      
      if (data.chatMessage) {
        addChatMessage(data.chatMessage);
      }
    } catch (error) {
      console.error('Error checking step:', error);
      addChatMessage({
        type: 'assistant',
        content: 'Sorry, I encountered an error while checking your step. Please try again.'
      });
    } finally {
      setIsCheckingStep(false);
    }
  };

  const handleNextStep = () => {
    if (guidedProject && guidedProject.currentStep < guidedProject.steps.length - 1) {
      setGuidedProject(prev => prev ? { ...prev, currentStep: prev.currentStep + 1 } : null);
      setStepFeedback([]);
      setHighlightedLines([]);
    }
  };

  const handlePreviousStep = () => {
    if (guidedProject && guidedProject.currentStep > 0) {
      setGuidedProject(prev => prev ? { ...prev, currentStep: prev.currentStep - 1 } : null);
      setStepFeedback([]);
      setHighlightedLines([]);
    }
  };

  const handleFinishProject = () => {
    setGuidedProject(null);
    setStepFeedback([]);
    setHighlightedLines([]);
    setCompletedSteps(new Set());
    addChatMessage({
      type: 'assistant',
      content: '🎉 Congratulations! You\'ve completed the guided project! Great job learning to code. Feel free to start another project or continue coding on your own.'
    });
  };

  const handleFixCode = async () => {
    if (!selectedFile || !selectedFile.content) {
      addChatMessage({
        type: 'assistant',
        content: 'Please select a file with code to fix.'
      });
      return;
    }

    setIsTyping(true);
    addChatMessage({
      type: 'user',
      content: 'Fix my code'
    });

    try {
      const currentStep = guidedProject?.steps[guidedProject.currentStep];
      const response = await fetch('/api/code/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFile.content,
          language: selectedFile.language || 'plaintext',
          error_message: stepFeedback.length > 0 
            ? stepFeedback.filter(f => !f.correct).map(f => f.suggestion).join('; ')
            : 'Please review and fix any issues in this code',
          projectFiles: files,
          stepInstruction: currentStep?.instruction
        }),
      });

      const data = await response.json();
      
      if (data.success && data.fixed_code && data.fixes_applied) {
        // Display the complete fixed code in chat
        const chatContent = `Here's your fixed code:\n\n\`\`\`${selectedFile.language}\n${data.fixed_code}\n\`\`\`\n\n**Changes made:**\n${data.fixes_applied.map((fix: any) => `• Line ${fix.line_number}: ${fix.explanation}`).join('\n')}\n\n${data.explanation}`;
        
        addChatMessage({
          type: 'assistant',
          content: chatContent
        });

        // Apply only the specific line changes to the editor
        if (data.fixes_applied && data.fixes_applied.length > 0) {
          const currentLines = selectedFile.content.split('\n');
          const changedLines: number[] = [];

          data.fixes_applied.forEach((fix: any) => {
            if (fix.line_number && fix.fixed_content) {
              const lineIndex = fix.line_number - 1; // Convert to 0-based index
              if (lineIndex >= 0 && lineIndex < currentLines.length) {
                currentLines[lineIndex] = fix.fixed_content;
                changedLines.push(fix.line_number);
              }
            }
          });

          const updatedCode = currentLines.join('\n');
          handleCodeChange(updatedCode);
          
          // Highlight the changed lines
          setHighlightedLines(changedLines);
          
          // Clear step feedback since code was fixed
          setStepFeedback([]);
        }
      } else {
        addChatMessage({
          type: 'assistant',
          content: data.explanation || 'I couldn\'t fix the code automatically. Please check for syntax errors and try again.'
        });
      }
    } catch (error) {
      console.error('Error fixing code:', error);
      addChatMessage({
        type: 'assistant',
        content: 'Sorry, I encountered an error while trying to fix your code. Please try again.'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleGetHint = async () => {
    if (!selectedFile) {
      addChatMessage({
        type: 'assistant',
        content: 'Please select a file to get a hint for.'
      });
      return;
    }

    setIsTyping(true);
    addChatMessage({
      type: 'user',
      content: 'Give me a hint'
    });

    try {
      const currentStep = guidedProject?.steps[guidedProject.currentStep];
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFile.content || '',
          language: selectedFile.language || 'plaintext',
          stepInstruction: currentStep?.instruction,
          lineRanges: currentStep?.lineRanges,
          stepId: currentStep?.id,
          projectFiles: files
        }),
      });

      const data = await response.json();
      
      if (data.success && data.hint) {
        addChatMessage({
          type: 'assistant',
          content: data.hint.hint_text
        });

        if (data.hint.line_number) {
          setHighlightedLines([data.hint.line_number]);
        }
      } else {
        addChatMessage({
          type: 'assistant',
          content: 'I couldn\'t generate a specific hint right now. Try asking me a specific question about your code!'
        });
      }
    } catch (error) {
      console.error('Error getting hint:', error);
      addChatMessage({
        type: 'assistant',
        content: 'Sorry, I encountered an error while generating a hint. Please try again.'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const currentStep = guidedProject?.steps[guidedProject.currentStep];
  const isCurrentStepComplete = currentStep ? completedSteps.has(currentStep.id) : false;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">CodeCraft IDE</h1>
          {guidedProject && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <BookOpen className="h-4 w-4" />
              <span>Step {guidedProject.currentStep + 1} of {guidedProject.steps.length}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {!guidedProject && (
            <Button 
              onClick={() => setShowProjectModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Start Guided Project
            </Button>
          )}
          
          <RunDropdown 
            files={files} 
            onRunFile={handleRunFile} 
            isRunning={isRunning} 
          />
          
          <Button 
            onClick={handleFixCode}
            variant="outline"
            className="border-orange-300 text-orange-600 hover:bg-orange-50"
          >
            <Zap className="mr-2 h-4 w-4" />
            Fix Code
          </Button>
          
          <Button 
            onClick={handleGetHint}
            variant="outline"
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
          >
            <Lightbulb className="mr-2 h-4 w-4" />
            Get Hint
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* File Explorer */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
            <FileExplorer
              files={files}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              selectedFileId={selectedFile?.id || null}
              isCollapsed={isExplorerCollapsed}
              onToggleCollapse={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Editor and Preview */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={70} minSize={40}>
                <div className="h-full bg-[#1e1e1e] flex flex-col">
                  {selectedFile ? (
                    <>
                      <div className="h-10 bg-[#2d2d30] flex items-center px-4 border-b border-[#3e3e42]">
                        <span className="text-white text-sm font-medium">{selectedFile.name}</span>
                        <span className="ml-2 text-gray-400 text-xs">({selectedFile.language})</span>
                      </div>
                      <div className="flex-1">
                        <MonacoEditor
                          language={selectedFile.language || 'plaintext'}
                          value={selectedFile.content || ''}
                          onChange={handleCodeChange}
                          highlightedLines={highlightedLines}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-4">📝</div>
                        <p className="text-lg">Select a file to start coding</p>
                        <p className="text-sm mt-2">Create a new file using the + button in the explorer</p>
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Output/Preview */}
              <ResizablePanel defaultSize={30} minSize={20}>
                <div className="h-full bg-white border-t">
                  {selectedFile?.language === 'html' ? (
                    <HTMLPreview 
                      htmlContent={selectedFile.content || ''} 
                      cssContent=""
                      jsContent=""
                    />
                  ) : (
                    <div className="h-full flex flex-col">
                      <div className="h-10 bg-gray-100 flex items-center px-4 border-b">
                        <span className="text-gray-700 text-sm font-medium">Output</span>
                      </div>
                      <div className="flex-1 p-4 font-mono text-sm bg-gray-900 text-green-400 overflow-auto">
                        <pre className="whitespace-pre-wrap">{output || 'Run a file to see output here...'}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle />

          {/* Chat Panel */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full bg-white flex flex-col border-l border-gray-200">
              {/* Chat Header */}
              <div className="h-12 bg-gray-50 flex items-center px-4 border-b border-gray-200">
                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-gray-900">AI Assistant</span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start space-x-2 max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className={`rounded-lg px-4 py-2 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: ({ inline, children, className, ...props }: any) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <pre className="bg-gray-900 text-green-400 p-3 rounded mt-2 mb-2 overflow-x-auto">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                                  {children}
                                </code>
                              );
                            },
                            p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }: any) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                            ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                            li: ({ children }: any) => <li className="mb-1">{children}</li>,
                            strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                            em: ({ children }: any) => <em className="italic">{children}</em>,
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
                    <div className="flex items-start space-x-2 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <TypingIndicator />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Ask me anything about coding..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isTyping}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isTyping}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isTyping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Guided Step Popup */}
      {guidedProject && currentStep && (
        <GuidedStepPopup
          instruction={currentStep.instruction}
          isComplete={isCurrentStepComplete}
          onNextStep={handleNextStep}
          onPreviousStep={handlePreviousStep}
          onCheckStep={handleCheckStep}
          stepNumber={guidedProject.currentStep + 1}
          totalSteps={guidedProject.steps.length}
          isChecking={isCheckingStep}
          onFinish={handleFinishProject}
        />
      )}

      {/* Project Description Modal */}
      <ProjectDescriptionModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleStartGuidedProject}
        isStartingProject={isStartingProject}
      />
    </div>
  );
}