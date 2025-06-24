'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  MessageSquare, 
  Lightbulb, 
  Code2, 
  Terminal, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Zap,
  Brain,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Copy,
  Download,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import FileExplorer from '@/components/FileExplorer';
import MonacoEditor from '@/components/MonacoEditor';
import HTMLPreview from '@/components/HTMLPreview';
import RunDropdown from '@/components/RunDropdown';
import TypingIndicator from '@/components/TypingIndicator';
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';
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
  timestamp?: Date;
}

interface GuidedStep {
  id: string;
  instruction: string;
  lineRanges: number[];
}

interface GuidedProject {
  projectId: string;
  steps: GuidedStep[];
  currentStep: number;
}

const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js': return 'javascript';
    case 'py': return 'python';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    default: return 'plaintext';
  }
};

export default function IDEPage() {
  // File management state
  const [files, setFiles] = useState<FileNode[]>([
    {
      id: '1',
      name: 'index.html',
      type: 'file',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Website</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
            padding: 40px 20px;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
            font-size: 1.2rem;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .button {
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.3);
            color: white;
            padding: 15px 30px;
            font-size: 1.1rem;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to My Website!</h1>
        <p>This is my first website built with HTML and CSS. I'm learning to code!</p>
        <button class="button" onclick="showMessage()">Click Me!</button>
        <div id="message"></div>
    </div>
    
    <script>
        function showMessage() {
            document.getElementById('message').innerHTML = '<p style="margin-top: 20px; font-size: 1.5rem;">🎉 Great job! You clicked the button!</p>';
        }
    </script>
</body>
</html>`,
      language: 'html'
    },
    {
      id: '2',
      name: 'script.js',
      type: 'file',
      content: `// Welcome to JavaScript!
console.log("Hello, World!");

// Function to greet a user
function greetUser(name) {
    return \`Hello, \${name}! Welcome to coding!\`;
}

// Example usage
const userName = "Future Developer";
const greeting = greetUser(userName);
console.log(greeting);

// Simple calculator functions
function add(a, b) {
    return a + b;
}

function multiply(a, b) {
    return a * b;
}

// Test the functions
console.log("5 + 3 =", add(5, 3));
console.log("4 * 7 =", multiply(4, 7));`,
      language: 'javascript'
    },
    {
      id: '3',
      name: 'main.py',
      type: 'file',
      content: `# Welcome to Python!
print("Hello, World!")

# Function to greet a user
def greet_user(name):
    return f"Hello, {name}! Welcome to coding!"

# Example usage
user_name = "Future Developer"
greeting = greet_user(user_name)
print(greeting)

# Simple calculator functions
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

# Test the functions
print(f"5 + 3 = {add(5, 3)}")
print(f"4 * 7 = {multiply(4, 7)}")

# Fun with lists
fruits = ["apple", "banana", "orange"]
print("My favorite fruits:")
for fruit in fruits:
    print(f"- {fruit}")`,
      language: 'python'
    }
  ]);

  const [selectedFile, setSelectedFile] = useState<FileNode | null>(files[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: 'Hi! I\'m your AI coding assistant. I can help you with:\n\n• **Code explanations** - Ask me about any code\n• **Error fixing** - Paste error messages for help\n• **Learning tips** - Get coding best practices\n• **Project guidance** - Start a guided project\n\nWhat would you like to work on today?',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  // Guided project state
  const [guidedProject, setGuidedProject] = useState<GuidedProject | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [stepComplete, setStepComplete] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('editor');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // File operations
  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
  };

  const handleFileCreate = (parentId: string | null, type: 'file' | 'folder', name: string) => {
    const newFile: FileNode = {
      id: Date.now().toString(),
      name,
      type,
      content: type === 'file' ? '' : undefined,
      children: type === 'folder' ? [] : undefined,
      language: type === 'file' ? getLanguageFromFileName(name) : undefined
    };

    if (parentId === null) {
      setFiles([...files, newFile]);
    } else {
      // Add to parent folder logic here
      console.log('Adding to parent folder:', parentId);
    }
  };

  const handleFileDelete = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(files[0] || null);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      const updatedFile = { ...selectedFile, content: value };
      setSelectedFile(updatedFile);
      setFiles(files.map(f => f.id === selectedFile.id ? updatedFile : f));
    }
  };

  // Run code
  const handleRunFile = async (file: FileNode) => {
    if (!file.content) return;

    setIsRunning(true);
    setOutput([]);

    try {
      if (file.language === 'python') {
        const response = await fetch('/api/python/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: file.content })
        });

        const result = await response.json();
        if (result.output) {
          setOutput(result.output.split('\n').filter((line: string) => line.trim()));
        }
        if (result.error) {
          setOutput(prev => [...prev, `Error: ${result.error}`]);
        }
      } else if (file.language === 'javascript') {
        try {
          const originalLog = console.log;
          const logs: string[] = [];
          console.log = (...args) => {
            logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
          };

          new Function(file.content)();
          console.log = originalLog;
          setOutput(logs);
        } catch (error) {
          setOutput([`Error: ${error}`]);
        }
      }
    } catch (error) {
      setOutput([`Error: ${error}`]);
    } finally {
      setIsRunning(false);
    }
  };

  // Chat functionality
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "That's a great question! Let me help you with that. Here's what I suggest:\n\n```javascript\n// Example code\nfunction example() {\n  console.log('Hello!');\n}\n```\n\nThis approach works because...",
        "I can see you're working on something interesting! Here are some tips:\n\n• **Best Practice**: Always use meaningful variable names\n• **Tip**: Break complex problems into smaller functions\n• **Debug**: Use console.log() to track your values\n\nWould you like me to explain any specific part?",
        "Excellent! That's exactly the right approach. Here's how you can improve it:\n\n```python\n# Improved version\ndef improved_function(data):\n    \"\"\"Process data efficiently\"\"\"\n    return [item.strip() for item in data if item]\n```\n\nThis is more efficient because it uses list comprehension.",
      ];

      const assistantMessage: ChatMessage = {
        type: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  // Guided project functionality
  const handleStartGuidedProject = async (description: string) => {
    try {
      const response = await fetch('/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectDescription: description,
          projectFiles: files 
        })
      });

      const result = await response.json();
      
      if (result.projectId && result.steps) {
        setGuidedProject({
          projectId: result.projectId,
          steps: result.steps,
          currentStep: 0
        });

        if (result.welcomeMessage) {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: result.welcomeMessage.content,
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error starting guided project:', error);
    }
  };

  const handleCheckStep = async () => {
    if (!guidedProject || !selectedFile) return;

    try {
      const response = await fetch('/api/guided/analyzeStep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guidedProject.projectId,
          stepId: guidedProject.steps[guidedProject.currentStep].id,
          code: selectedFile.content || '',
          language: selectedFile.language || 'plaintext',
          projectFiles: files
        })
      });

      const result = await response.json();
      
      if (result.chatMessage) {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: result.chatMessage.content,
          timestamp: new Date()
        }]);
      }

      const allCorrect = result.feedback?.every((f: any) => f.correct) || false;
      setStepComplete(allCorrect);
    } catch (error) {
      console.error('Error checking step:', error);
    }
  };

  const handleNextStep = () => {
    if (!guidedProject || !stepComplete) return;

    const nextStepIndex = guidedProject.currentStep + 1;
    if (nextStepIndex < guidedProject.steps.length) {
      setGuidedProject({
        ...guidedProject,
        currentStep: nextStepIndex
      });
      setStepComplete(false);

      const nextStep = guidedProject.steps[nextStepIndex];
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `Great job! Now let's move to step ${nextStepIndex + 1}:\n\n${nextStep.instruction}`,
        timestamp: new Date()
      }]);
    } else {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: '🎉 Congratulations! You\'ve completed the guided project! You\'re doing amazing!',
        timestamp: new Date()
      }]);
      setGuidedProject(null);
    }
  };

  const handlePreviousStep = () => {
    if (!guidedProject) return;

    const prevStepIndex = guidedProject.currentStep - 1;
    if (prevStepIndex >= 0) {
      setGuidedProject({
        ...guidedProject,
        currentStep: prevStepIndex
      });
      setStepComplete(false);

      const prevStep = guidedProject.steps[prevStepIndex];
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `Back to step ${prevStepIndex + 1}:\n\n${prevStep.instruction}`,
        timestamp: new Date()
      }]);
    }
  };

  const formatCodeInMessage = (content: string) => {
    // Split content by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract language and code
        const lines = part.slice(3, -3).split('\n');
        const language = lines[0] || '';
        const code = lines.slice(1).join('\n');
        
        return (
          <div key={index} className="my-4">
            <div className="bg-gray-800 rounded-t-lg px-4 py-2 text-xs text-gray-400 border-b border-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Code2 className="h-3 w-3" />
                {language || 'code'}
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-white transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <pre className="bg-gray-900 rounded-b-lg p-4 overflow-x-auto text-sm">
              <code className={`language-${language}`}>{code}</code>
            </pre>
          </div>
        );
      } else {
        // Regular text with inline code formatting
        return (
          <div key={index} className="whitespace-pre-wrap">
            {part.split(/(`[^`]+`)/g).map((segment, i) => {
              if (segment.startsWith('`') && segment.endsWith('`')) {
                return (
                  <code key={i} className="bg-gray-800 px-2 py-1 rounded text-sm font-mono text-blue-300">
                    {segment.slice(1, -1)}
                  </code>
                );
              }
              return segment;
            })}
          </div>
        );
      }
    });
  };

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} transition-colors duration-300`}>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              CodeCraft IDE
            </h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Ready to code</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hidden sm:flex"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden sm:flex"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <RunDropdown 
            files={files} 
            onRunFile={handleRunFile} 
            isRunning={isRunning} 
          />

          <Button
            onClick={() => setShowProjectModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Start Guided Project</span>
            <span className="sm:hidden">Guide</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* File Explorer */}
          <ResizablePanel 
            defaultSize={20} 
            minSize={15}
            maxSize={35}
            className={isExplorerCollapsed ? "hidden" : ""}
          >
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

          {!isExplorerCollapsed && <ResizableHandle withHandle />}

          {/* Editor and Preview */}
          <ResizablePanel defaultSize={isExplorerCollapsed ? 70 : 50} minSize={30}>
            <div className="flex flex-col h-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800/50">
                  <TabsList className="bg-gray-800 border border-gray-700">
                    <TabsTrigger value="editor" className="data-[state=active]:bg-blue-600">
                      <Code2 className="mr-2 h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="data-[state=active]:bg-green-600">
                      <Play className="mr-2 h-4 w-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="terminal" className="data-[state=active]:bg-purple-600">
                      <Terminal className="mr-2 h-4 w-4" />
                      Output
                    </TabsTrigger>
                  </TabsList>

                  {selectedFile && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-mono">{selectedFile.name}</span>
                    </div>
                  )}
                </div>

                <TabsContent value="editor" className="flex-1 m-0">
                  {selectedFile ? (
                    <MonacoEditor
                      language={selectedFile.language || 'plaintext'}
                      value={selectedFile.content || ''}
                      onChange={handleCodeChange}
                      theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800/20">
                      <div className="text-center">
                        <Code2 className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">Select a file to start coding</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="flex-1 m-0">
                  {selectedFile?.language === 'html' ? (
                    <HTMLPreview 
                      htmlContent={selectedFile.content || ''} 
                      onConsoleLog={(message) => setOutput(prev => [...prev, message])}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-800/20">
                      <div className="text-center">
                        <Play className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">Preview available for HTML files</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="terminal" className="flex-1 m-0">
                  <div className="h-full bg-gray-900 p-4 font-mono text-sm overflow-y-auto">
                    <div className="flex items-center space-x-2 mb-4 text-green-400">
                      <Terminal className="h-4 w-4" />
                      <span>Output Console</span>
                    </div>
                    {output.length > 0 ? (
                      <div className="space-y-1">
                        {output.map((line, index) => (
                          <div key={index} className="text-gray-300">
                            <span className="text-gray-500 mr-2">{'>'}</span>
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">
                        Run your code to see output here...
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Chat Panel */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
            <div className="flex flex-col h-full bg-gray-800/30 border-l border-gray-700">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">AI Assistant</h3>
                    <p className="text-xs text-gray-400">Always here to help</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Online</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-4'
                          : 'bg-gray-700/50 text-gray-100 mr-4 border border-gray-600/50'
                      } shadow-lg`}
                    >
                      {message.type === 'assistant' ? (
                        <div className="prose prose-invert max-w-none">
                          {formatCodeInMessage(message.content)}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}
                      
                      {message.timestamp && (
                        <p className="text-xs opacity-70 mt-2">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700/50 rounded-2xl px-4 py-3 mr-4 border border-gray-600/50">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything about coding..."
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isTyping}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-center mt-3 space-x-4 text-xs text-gray-500">
                  <button className="hover:text-blue-400 transition-colors flex items-center space-x-1">
                    <Lightbulb className="h-3 w-3" />
                    <span>Get Hint</span>
                  </button>
                  <button className="hover:text-green-400 transition-colors flex items-center space-x-1">
                    <Zap className="h-3 w-3" />
                    <span>Fix Code</span>
                  </button>
                  <button className="hover:text-purple-400 transition-colors flex items-center space-x-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>Explain</span>
                  </button>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Guided Step Popup */}
      {guidedProject && (
        <div className="fixed bottom-4 left-4 right-4 md:left-16 md:right-16 lg:left-1/4 lg:right-1/4 z-50">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-blue-500/50 rounded-2xl shadow-2xl p-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                    {guidedProject.currentStep + 1}
                  </div>
                  <h3 className="font-bold text-blue-400">
                    Step {guidedProject.currentStep + 1} of {guidedProject.steps.length}
                  </h3>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {guidedProject.steps[guidedProject.currentStep]?.instruction}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <Button
                  onClick={handlePreviousStep}
                  variant="outline"
                  size="sm"
                  disabled={guidedProject.currentStep === 0}
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 flex-1 sm:flex-none"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  onClick={handleCheckStep}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold flex-1 sm:flex-none"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Check Step
                </Button>
                
                <Button
                  onClick={handleNextStep}
                  disabled={!stepComplete}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold flex-1 sm:flex-none"
                >
                  {stepComplete ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Next Step
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Complete Step
                    </>
                  )}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Description Modal */}
      <ProjectDescriptionModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onSubmit={handleStartGuidedProject}
      />
    </div>
  );
}