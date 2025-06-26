'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  MessageSquare, 
  Send, 
  Lightbulb, 
  Wrench, 
  RotateCcw, 
  Code2, 
  FileText, 
  Terminal,
  Sparkles,
  User,
  Bot,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';
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
  timestamp?: string;
}

interface GuidedProject {
  id: string;
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

const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
      return 'javascript';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'ts':
      return 'typescript';
    default:
      return 'plaintext';
  }
};

const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export default function IDEPage() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [code, setCode] = useState('');
  const [editorLanguage, setEditorLanguage] = useState('plaintext');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: 'Welcome to CodeCraft IDE! I\'m here to help you learn to code. You can ask me questions, get hints, or start a guided project. What would you like to work on today?'
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const [guidedProject, setGuidedProject] = useState<GuidedProject | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isStartingProject, setIsStartingProject] = useState(false);
  const [stepFeedback, setStepFeedback] = useState<StepFeedback[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isCheckingStep, setIsCheckingStep] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    setCode(file.content || '');
    setEditorLanguage(file.language || 'plaintext');
    setHighlightedLines([]);
  };

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (selectedFile) {
      const updatedFiles = updateFileContent(files, selectedFile.id, newCode);
      setFiles(updatedFiles);
      setSelectedFile({ ...selectedFile, content: newCode });
    }
  };

  const updateFileContent = (fileList: FileNode[], fileId: string, content: string): FileNode[] => {
    return fileList.map(file => {
      if (file.id === fileId) {
        return { ...file, content };
      }
      if (file.children) {
        return { ...file, children: updateFileContent(file.children, fileId, content) };
      }
      return file;
    });
  };

  const handleFileCreate = (parentId: string | null, type: 'file' | 'folder', name: string) => {
    const newFile: FileNode = {
      id: generateId(),
      name,
      type,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
      language: type === 'file' ? getLanguageFromFileName(name) : undefined
    };

    if (parentId === null) {
      setFiles([...files, newFile]);
    } else {
      const updatedFiles = addFileToParent(files, parentId, newFile);
      setFiles(updatedFiles);
    }

    if (type === 'file') {
      setSelectedFile(newFile);
      setCode('');
      setEditorLanguage(newFile.language || 'plaintext');
    }
  };

  const addFileToParent = (fileList: FileNode[], parentId: string, newFile: FileNode): FileNode[] => {
    return fileList.map(file => {
      if (file.id === parentId && file.type === 'folder') {
        return { ...file, children: [...(file.children || []), newFile] };
      }
      if (file.children) {
        return { ...file, children: addFileToParent(file.children, parentId, newFile) };
      }
      return file;
    });
  };

  const handleFileDelete = (fileId: string) => {
    const updatedFiles = removeFile(files, fileId);
    setFiles(updatedFiles);
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
      setCode('');
      setEditorLanguage('plaintext');
    }
  };

  const removeFile = (fileList: FileNode[], fileId: string): FileNode[] => {
    return fileList.filter(file => {
      if (file.id === fileId) {
        return false;
      }
      if (file.children) {
        file.children = removeFile(file.children, fileId);
      }
      return true;
    });
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
          body: JSON.stringify({ code: file.content })
        });

        const result = await response.json();
        if (result.error) {
          setOutput(`Error: ${result.error}`);
        } else {
          setOutput(result.output || 'Program completed successfully');
        }
      } else if (file.language === 'html') {
        setOutput('HTML file is being previewed in the Preview tab');
      } else {
        setOutput('File type not supported for execution');
      }
    } catch (error) {
      setOutput(`Error: ${error}`);
    } finally {
      setIsRunning(false);
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
      const endpoint = guidedProject ? '/api/guided/project-chat' : '/api/guided/simple-chat';
      const requestBody = guidedProject 
        ? {
            projectId: guidedProject.id,
            currentStep: guidedProject.currentStep,
            history: [...chatMessages, userMessage],
            projectFiles: files
          }
        : {
            history: [...chatMessages, userMessage],
            projectFiles: files,
            guidedProject,
            currentCode: code,
            currentLanguage: editorLanguage
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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

  const getHint = async () => {
    if (!selectedFile || !code) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please select a file and write some code first, then I can provide hints!'
      }]);
      return;
    }

    setIsTyping(true);

    try {
      const currentStep = guidedProject?.steps[guidedProject.currentStep];
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: editorLanguage,
          stepInstruction: currentStep?.instruction,
          lineRanges: currentStep?.lineRanges,
          stepId: currentStep?.id,
          projectFiles: files
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: data.hint.hint_text
        }]);

        if (data.hint.line_number) {
          setHighlightedLines([data.hint.line_number]);
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t generate a hint right now. Please try again.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const fixCode = async () => {
    if (!selectedFile || !code) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please select a file and write some code first, then I can help fix it!'
      }]);
      return;
    }

    setIsTyping(true);

    try {
      const response = await fetch('/api/code/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: editorLanguage,
          error_message: 'Please analyze and fix any issues in this code',
          projectFiles: files
        })
      });

      const data = await response.json();
      
      if (data.success && data.fixed_code) {
        // Display the complete fixed code in chat
        const fixedCodeMessage = `Here's your fixed code:\n\n\`\`\`${editorLanguage}\n${data.fixed_code}\n\`\`\`\n\n**Changes made:**\n${data.explanation}`;
        
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: fixedCodeMessage
        }]);

        // Apply only the specific line changes to the editor
        if (data.fixes_applied && data.fixes_applied.length > 0) {
          let updatedCode = code;
          const lines = updatedCode.split('\n');
          const changedLines: number[] = [];

          // Apply each fix to the specific lines
          data.fixes_applied.forEach((fix: any) => {
            if (fix.line_number && fix.line_number <= lines.length) {
              lines[fix.line_number - 1] = fix.fixed_content;
              changedLines.push(fix.line_number);
            }
          });

          updatedCode = lines.join('\n');
          setCode(updatedCode);
          handleCodeChange(updatedCode);
          
          // Highlight the changed lines
          setHighlightedLines(changedLines);
        } else {
          // Fallback: if no specific fixes, update the entire code
          setCode(data.fixed_code);
          handleCodeChange(data.fixed_code);
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t fix the code right now. Please try again.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startGuidedProject = async (description: string) => {
    setIsStartingProject(true);
    
    try {
      const response = await fetch('/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectDescription: description,
          projectFiles: files 
        })
      });

      const data = await response.json();
      
      if (data.projectId && data.steps) {
        const newProject: GuidedProject = {
          id: data.projectId,
          steps: data.steps,
          currentStep: 0,
          description
        };
        
        setGuidedProject(newProject);
        setCompletedSteps(new Set());
        
        if (data.welcomeMessage) {
          setChatMessages(prev => [...prev, data.welcomeMessage]);
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t start the guided project. Please try again.'
      }]);
    } finally {
      setIsStartingProject(false);
      setShowProjectModal(false);
    }
  };

  const checkCurrentStep = async () => {
    if (!guidedProject || !selectedFile) return;

    setIsCheckingStep(true);
    
    try {
      const currentStep = guidedProject.steps[guidedProject.currentStep];
      const response = await fetch('/api/guided/analyzeStep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guidedProject.id,
          stepId: currentStep.id,
          code: code,
          language: editorLanguage,
          projectFiles: files
        })
      });

      const data = await response.json();
      
      if (data.feedback) {
        setStepFeedback(data.feedback);
        const allCorrect = data.feedback.every((f: StepFeedback) => f.correct);
        
        if (allCorrect) {
          setCompletedSteps(prev => new Set([...prev, currentStep.id]));
        }

        if (data.chatMessage) {
          setChatMessages(prev => [...prev, data.chatMessage]);
        }
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I couldn\'t check your step. Please try again.'
      }]);
    } finally {
      setIsCheckingStep(false);
    }
  };

  const goToNextStep = () => {
    if (!guidedProject) return;
    
    if (guidedProject.currentStep < guidedProject.steps.length - 1) {
      const newStep = guidedProject.currentStep + 1;
      setGuidedProject({ ...guidedProject, currentStep: newStep });
      setStepFeedback([]);
      setHighlightedLines([]);
      
      const nextStepInstruction = guidedProject.steps[newStep].instruction;
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `Great! Let's move to the next step:\n\n${nextStepInstruction}`
      }]);
    }
  };

  const goToPreviousStep = () => {
    if (!guidedProject) return;
    
    if (guidedProject.currentStep > 0) {
      const newStep = guidedProject.currentStep - 1;
      setGuidedProject({ ...guidedProject, currentStep: newStep });
      setStepFeedback([]);
      setHighlightedLines([]);
      
      const prevStepInstruction = guidedProject.steps[newStep].instruction;
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `Going back to the previous step:\n\n${prevStepInstruction}`
      }]);
    }
  };

  const finishGuidedProject = () => {
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: `🎉 Congratulations! You've completed the guided project: "${guidedProject?.description}". Great job learning to code! Feel free to start a new project or continue exploring on your own.`
    }]);
    
    setGuidedProject(null);
    setCompletedSteps(new Set());
    setStepFeedback([]);
    setHighlightedLines([]);
  };

  const currentStep = guidedProject?.steps[guidedProject.currentStep];
  const isCurrentStepComplete = currentStep ? completedSteps.has(currentStep.id) : false;

  const getHTMLContent = () => {
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    return htmlFile?.content || '<html><body><h1>No HTML file found</h1></body></html>';
  };

  const getCSSContent = () => {
    const cssFile = files.find(f => f.name.endsWith('.css'));
    return cssFile?.content || '';
  };

  const getJSContent = () => {
    const jsFile = files.find(f => f.name.endsWith('.js'));
    return jsFile?.content || '';
  };

  return (
    <div className="h-screen bg-[#094074] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#3c6997]">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-[#5adbff] to-[#ffdd4a] p-2 rounded-lg">
            <Code2 className="h-6 w-6 text-[#094074]" />
          </div>
          <h1 className="text-xl font-bold text-[#5adbff]">CodeCraft IDE</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {!guidedProject && (
            <Button
              onClick={() => setShowProjectModal(true)}
              className="bg-gradient-to-r from-[#5adbff] to-[#ffdd4a] text-[#094074] hover:opacity-90 font-semibold"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start Guided Project
            </Button>
          )}
          <RunDropdown files={files} onRunFile={handleRunFile} isRunning={isRunning} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* File Explorer */}
          <ResizablePanel defaultSize={20} minSize={15}>
            <FileExplorer
              files={files}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              selectedFileId={selectedFile?.id || null}
            />
          </ResizablePanel>

          <ResizableHandle />

          {/* Editor and Preview */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full bg-[#1e1e1e]">
              {selectedFile ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between p-2 bg-[#2d2d30] border-b border-[#3c3c3c]">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-300">{selectedFile.name}</span>
                      <Select value={editorLanguage} onValueChange={setEditorLanguage}>
                        <SelectTrigger className="w-32 h-7 text-xs bg-[#3c3c3c] border-[#5a5a5a] text-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                          <SelectItem value="css">CSS</SelectItem>
                          <SelectItem value="typescript">TypeScript</SelectItem>
                          <SelectItem value="plaintext">Plain Text</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={getHint}
                        className="text-[#ffdd4a] hover:bg-[#3c3c3c]"
                      >
                        <Lightbulb className="h-4 w-4 mr-1" />
                        Hint
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={fixCode}
                        className="text-[#5adbff] hover:bg-[#3c3c3c]"
                      >
                        <Wrench className="h-4 w-4 mr-1" />
                        Fix
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <MonacoEditor
                      language={editorLanguage}
                      value={code}
                      onChange={handleCodeChange}
                      highlightedLines={highlightedLines}
                      readOnly={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select a file to start coding</p>
                    <p className="text-sm mt-2">Create a new file using the + button in the file explorer</p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel - Chat and Output */}
          <ResizablePanel defaultSize={30} minSize={25}>
            <Tabs defaultValue="chat" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 bg-[#3c6997]">
                <TabsTrigger value="chat" className="data-[state=active]:bg-[#5adbff] data-[state=active]:text-[#094074]">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="output" className="data-[state=active]:bg-[#5adbff] data-[state=active]:text-[#094074]">
                  <Terminal className="h-4 w-4 mr-2" />
                  Output
                </TabsTrigger>
                <TabsTrigger value="preview" className="data-[state=active]:bg-[#5adbff] data-[state=active]:text-[#094074]">
                  <Play className="h-4 w-4 mr-2" />
                  Preview
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
                      placeholder="Ask me anything about coding..."
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

              <TabsContent value="output" className="flex-1 p-4">
                <ScrollArea className="h-full">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {output || 'No output yet. Run a file to see results here.'}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 p-0">
                <HTMLPreview
                  htmlContent={getHTMLContent()}
                  cssContent={getCSSContent()}
                  jsContent={getJSContent()}
                  onConsoleLog={(message) => setOutput(prev => prev + '\n' + message)}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Guided Step Popup */}
      {guidedProject && currentStep && (
        <GuidedStepPopup
          instruction={currentStep.instruction}
          isComplete={isCurrentStepComplete}
          onNextStep={goToNextStep}
          onPreviousStep={goToPreviousStep}
          onCheckStep={checkCurrentStep}
          stepNumber={guidedProject.currentStep + 1}
          totalSteps={guidedProject.steps.length}
          isChecking={isCheckingStep}
          onFinish={finishGuidedProject}
        />
      )}

      {/* Project Description Modal */}
      <ProjectDescriptionModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSubmit={startGuidedProject}
        isStartingProject={isStartingProject}
      />
    </div>
  );
}