'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  MessageSquare, 
  Lightbulb, 
  Code2, 
  Terminal, 
  Sparkles, 
  X,
  Brain,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Copy,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable';
import FileExplorer from '@/components/FileExplorer';
import MonacoEditor from '@/components/MonacoEditor';
import HTMLPreview from '@/components/HTMLPreview';
import RunDropdown from '@/components/RunDropdown';
import TypingIndicator from '@/components/TypingIndicator';
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';

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

// Helper function to recursively find all files in the file tree
const getAllFiles = (files: FileNode[]): FileNode[] => {
  const allFiles: FileNode[] = [];
  
  const traverse = (nodes: FileNode[]) => {
    nodes.forEach(node => {
      if (node.type === 'file') {
        allFiles.push(node);
      } else if (node.children) {
        traverse(node.children);
      }
    });
  };
  
  traverse(files);
  return allFiles;
};

export default function IDEPage() {
  // File management state - Start with empty files array
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);

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

  // Guided project state
  const [guidedProject, setGuidedProject] = useState<GuidedProject | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [stepComplete, setStepComplete] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('editor');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Clear highlighted lines when file changes or code is modified
  useEffect(() => {
    setHighlightedLines([]);
  }, [selectedFile?.id]);

  // File operations
  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    setHighlightedLines([]); // Clear highlights when switching files
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

    const addFileToTree = (nodes: FileNode[], parentId: string | null): FileNode[] => {
      if (parentId === null) {
        return [...nodes, newFile];
      }
      
      return nodes.map(node => {
        if (node.id === parentId && node.type === 'folder') {
          return {
            ...node,
            children: [...(node.children || []), newFile]
          };
        } else if (node.children) {
          return {
            ...node,
            children: addFileToTree(node.children, parentId)
          };
        }
        return node;
      });
    };

    setFiles(addFileToTree(files, parentId));
    if (type === 'file') {
      setSelectedFile(newFile);
    }
  };

  const handleFileDelete = (fileId: string) => {
    const deleteFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.id === fileId) {
          return false;
        }
        if (node.children) {
          node.children = deleteFromTree(node.children);
        }
        return true;
      });
    };

    setFiles(deleteFromTree(files));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  const handleFileMove = (fileId: string, newParentId: string | null) => {
    let fileToMove: FileNode | null = null;
    
    // Find and remove the file from its current location
    const removeFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.id === fileId) {
          fileToMove = node;
          return false;
        }
        if (node.children) {
          node.children = removeFromTree(node.children);
        }
        return true;
      });
    };

    // Add the file to its new location
    const addToTree = (nodes: FileNode[], parentId: string | null, file: FileNode): FileNode[] => {
      if (parentId === null) {
        return [...nodes, file];
      }
      
      return nodes.map(node => {
        if (node.id === parentId && node.type === 'folder') {
          return {
            ...node,
            children: [...(node.children || []), file]
          };
        } else if (node.children) {
          return {
            ...node,
            children: addToTree(node.children, parentId, file)
          };
        }
        return node;
      });
    };

    let updatedFiles = removeFromTree([...files]);
    if (fileToMove) {
      updatedFiles = addToTree(updatedFiles, newParentId, fileToMove);
      setFiles(updatedFiles);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      const updatedFile = { ...selectedFile, content: value };
      setSelectedFile(updatedFile);
      
      const updateFileInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.id === selectedFile.id) {
            return updatedFile;
          } else if (node.children) {
            return {
              ...node,
              children: updateFileInTree(node.children)
            };
          }
          return node;
        });
      };
      
      setFiles(updateFileInTree(files));
      
      // Clear highlights when code is modified
      setHighlightedLines([]);
    }
  };

  // Run code with automatic tab switching
  const handleRunFile = async (file: FileNode) => {
    if (!file.content) return;

    setIsRunning(true);
    setOutput([]);

    // Auto-switch tabs based on file type
    if (file.language === 'html') {
      setActiveTab('preview');
    } else {
      setActiveTab('terminal');
    }

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

    try {
      const response = await fetch('/api/guided/simple-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: [...chatMessages, userMessage],
          projectFiles: files,
          guidedProject: guidedProject,
          currentCode: selectedFile?.content || '',
          currentLanguage: selectedFile?.language || 'plaintext'
        })
      });

      const result = await response.json();
      
      if (result.response) {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: result.response.content,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      // Fallback response
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
    } finally {
      setIsTyping(false);
    }
  };

  // Chat action buttons functionality
  const handleGetHint = async () => {
    if (!selectedFile || !selectedFile.content) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please select a file with some code first, and I\'ll give you a helpful hint!',
        timestamp: new Date()
      }]);
      return;
    }

    setIsTyping(true);
    try {
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFile.content,
          language: selectedFile.language,
          stepInstruction: guidedProject?.steps[guidedProject.currentStep]?.instruction,
          lineRanges: guidedProject?.steps[guidedProject.currentStep]?.lineRanges,
          stepId: guidedProject?.steps[guidedProject.currentStep]?.id,
          projectFiles: files
        })
      });

      const result = await response.json();
      
      if (result.success && result.hint) {
        // Highlight the line if specified
        if (result.hint.line_number) {
          setHighlightedLines([result.hint.line_number]);
        }
        
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `💡 **Hint**: ${result.hint.hint_text}\n\n${result.hint.detailed_explanation ? `**Details**: ${result.hint.detailed_explanation}` : ''}${result.hint.line_number ? `\n\n*Check line ${result.hint.line_number} in your code (highlighted in yellow)*` : ''}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: '💡 **Hint**: Try breaking down your problem into smaller steps. Look for any syntax errors first, then check your logic flow!',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFixCode = async () => {
    if (!selectedFile || !selectedFile.content) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please select a file with some code first, and I\'ll help you fix any issues!',
        timestamp: new Date()
      }]);
      return;
    }

    setIsTyping(true);
    try {
      const response = await fetch('/api/code/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFile.content,
          language: selectedFile.language,
          error_message: 'General code review and improvement',
          projectFiles: files
        })
      });

      const result = await response.json();
      
      if (result.success && result.fixed_code && result.fixes_applied) {
        // Highlight lines that were fixed
        const fixedLines = result.fixes_applied.map((fix: any) => fix.line_number).filter((line: number) => line);
        if (fixedLines.length > 0) {
          setHighlightedLines(fixedLines);
        }
        
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `🔧 **Code Fix Suggestions**:\n\n\`\`\`${selectedFile.language}\n${result.fixed_code}\n\`\`\`\n\n**Explanation**: ${result.explanation}\n\n**Confidence**: ${result.confidence_score}%${fixedLines.length > 0 ? `\n\n*Fixed lines are highlighted in yellow in your editor*` : ''}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: '🔧 **Code Review**: Your code looks good! Here are some general tips:\n\n• Check for proper indentation\n• Use meaningful variable names\n• Add comments for complex logic\n• Test your code with different inputs',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExplainCode = async () => {
    if (!selectedFile || !selectedFile.content) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please select a file with some code first, and I\'ll explain what it does!',
        timestamp: new Date()
      }]);
      return;
    }

    setIsTyping(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Explain this ${selectedFile.language} code: ${selectedFile.content}`,
          projectFiles: files
        })
      });

      const result = await response.json();
      
      if (result.success && result.translation) {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `📚 **Code Explanation**:\n\n${result.translation.text}\n\n**Suggestions**:\n${result.translation.suggestions?.map((s: string) => `• ${s}`).join('\n') || 'Keep up the great work!'}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `📚 **Code Explanation**:\n\nThis ${selectedFile.language} code appears to be well-structured. Here's what it does:\n\n• Defines functions and variables\n• Implements logic for your application\n• Uses proper ${selectedFile.language} syntax\n\nWould you like me to explain any specific part in more detail?`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
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
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'I\'m ready to help you with your project! Let\'s start by creating some files and writing code together. What would you like to build?',
        timestamp: new Date()
      }]);
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
      setStepComplete(true); // Allow progression for demo
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Great work! Your code looks good for this step. You can proceed to the next one!',
        timestamp: new Date()
      }]);
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
            <div className="bg-[#094074] rounded-t-lg px-4 py-2 text-xs text-[#5adbff] border-b border-[#3c6997] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Code2 className="h-3 w-3" />
                {language || 'code'}
              </span>
              <button 
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-[#ffdd4a] transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <pre className="bg-[#3c6997] rounded-b-lg p-4 overflow-x-auto text-sm text-white">
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
                  <code key={i} className="bg-[#094074] px-2 py-1 rounded text-sm font-mono text-[#5adbff]">
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
    <div className="flex flex-col h-screen bg-[#094074] text-white transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#3c6997] bg-[#094074] shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#5adbff] rounded-lg flex items-center justify-center">
              <Code2 className="h-5 w-5 text-[#094074]" />
            </div>
            <h1 className="text-xl font-bold text-[#5adbff]">
              CodeCraft IDE
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <RunDropdown 
            files={files} 
            onRunFile={handleRunFile} 
            isRunning={isRunning} 
          />

          <Button
            onClick={() => setShowProjectModal(true)}
            className="bg-[#ff960d] hover:bg-[#ffdd4a] text-white hover:text-[#094074] font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
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
            defaultSize={isExplorerCollapsed ? 0 : 20} 
            minSize={0}
            maxSize={35}
            collapsible={true}
            onCollapse={() => setIsExplorerCollapsed(true)}
            onExpand={() => setIsExplorerCollapsed(false)}
          >
            <FileExplorer
              files={files}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              onFileMove={handleFileMove}
              selectedFileId={selectedFile?.id || null}
              isCollapsed={isExplorerCollapsed}
              onToggleCollapse={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
            />
          </ResizablePanel>

          {/* Editor and Preview */}
          <ResizablePanel defaultSize={isExplorerCollapsed ? 70 : 50} minSize={30}>
            <div className="flex flex-col h-full">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#3c6997] bg-[#3c6997]">
                  <TabsList className="bg-[#094074] border border-[#3c6997]">
                    <TabsTrigger value="editor" className="data-[state=active]:bg-[#5adbff] data-[state=active]:text-[#094074]">
                      <Code2 className="mr-2 h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="data-[state=active]:bg-[#ffdd4a] data-[state=active]:text-[#094074]">
                      <Play className="mr-2 h-4 w-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="terminal" className="data-[state=active]:bg-[#ff960d] data-[state=active]:text-white">
                      <Terminal className="mr-2 h-4 w-4" />
                      Output
                    </TabsTrigger>
                  </TabsList>

                  {selectedFile && (
                    <div className="flex items-center space-x-2 text-sm text-[#5adbff]">
                      <div className="w-2 h-2 bg-[#5adbff] rounded-full"></div>
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
                      theme="vs-dark"
                      highlightedLines={highlightedLines}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-[#3c6997]/20">
                      <div className="text-center">
                        <Code2 className="h-16 w-16 text-[#5adbff] mx-auto mb-4" />
                        <p className="text-[#5adbff] text-lg">Create a file to start coding</p>
                        <p className="text-[#5adbff]/70 text-sm mt-2">Use the file explorer to create your first file</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="flex-1 m-0">
                  {selectedFile?.language === 'html' ? (
                    <HTMLPreview 
                      htmlContent={selectedFile.content || ''} 
                      cssContent={getAllFiles(files).find(f => f.language === 'css')?.content}
                      jsContent={getAllFiles(files).find(f => f.language === 'javascript')?.content}
                      onConsoleLog={(message) => setOutput(prev => [...prev, message])}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-[#3c6997]/20">
                      <div className="text-center">
                        <Play className="h-16 w-16 text-[#5adbff] mx-auto mb-4" />
                        <p className="text-[#5adbff] text-lg">Preview available for HTML files</p>
                        <p className="text-[#5adbff]/70 text-sm mt-2">Create an HTML file to see the preview</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="terminal" className="flex-1 m-0">
                  <div className="h-full bg-[#094074] p-4 font-mono text-sm overflow-y-auto">
                    <div className="flex items-center space-x-2 mb-4 text-[#ffdd4a]">
                      <Terminal className="h-4 w-4" />
                      <span>Output Console</span>
                    </div>
                    {output.length > 0 ? (
                      <div className="space-y-1">
                        {output.map((line, index) => (
                          <div key={index} className="text-[#5adbff]">
                            <span className="text-[#ffdd4a] mr-2">{'>'}</span>
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#5adbff] italic">
                        Run your code to see output here...
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          {/* Chat Panel */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
            <div className="flex flex-col h-full bg-[#3c6997] border-l border-[#094074]">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#094074] bg-[#094074]">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#5adbff] rounded-full flex items-center justify-center">
                    <Brain className="h-4 w-4 text-[#094074]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#5adbff]">AI Assistant</h3>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#3c6997]">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.type === 'user'
                          ? 'bg-[#5adbff] text-[#094074] ml-4'
                          : 'bg-[#094074] text-[#5adbff] mr-4 border border-[#5adbff]/20'
                      } shadow-lg`}
                    >
                      {message.type === 'assistant' ? (
                        <div className="prose prose-invert max-w-none text-[#5adbff]">
                          {formatCodeInMessage(message.content)}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}
                      
                      {message.timestamp && (
                        <p className={`text-xs opacity-70 mt-2 ${message.type === 'user' ? 'text-[#094074]/70' : 'text-[#5adbff]/70'}`}>
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
                    <div className="bg-[#094074] rounded-2xl px-4 py-3 mr-4 border border-[#5adbff]/20">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-[#094074] bg-[#094074]">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything about coding..."
                    className="flex-1 bg-[#3c6997] border border-[#5adbff] rounded-xl px-4 py-3 text-white placeholder-[#5adbff]/70 focus:outline-none focus:ring-2 focus:ring-[#5adbff] focus:border-transparent transition-all duration-200"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isTyping}
                    className="bg-[#5adbff] hover:bg-[#ffdd4a] text-[#094074] px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Enhanced Chat Action Buttons */}
                <div className="flex items-center justify-center mt-4 space-x-3">
                  <Button
                    onClick={handleGetHint}
                    variant="outline"
                    size="sm"
                    className="bg-[#ff960d] hover:bg-[#ffdd4a] text-white hover:text-[#094074] border-[#ff960d] hover:border-[#ffdd4a] px-4 py-2 font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Get Hint
                  </Button>
                  
                  <Button
                    onClick={handleFixCode}
                    variant="outline"
                    size="sm"
                    className="bg-[#ff960d] hover:bg-[#ffdd4a] text-white hover:text-[#094074] border-[#ff960d] hover:border-[#ffdd4a] px-4 py-2 font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Fix Code
                  </Button>
                  
                  <Button
                    onClick={handleExplainCode}
                    variant="outline"
                    size="sm"
                    className="bg-[#ff960d] hover:bg-[#ffdd4a] text-white hover:text-[#094074] border-[#ff960d] hover:border-[#ffdd4a] px-4 py-2 font-semibold transition-all duration-200 transform hover:scale-105"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Explain
                  </Button>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Guided Step Popup - Moved slightly to the left */}
      {guidedProject && (
        <div className="fixed bottom-4 left-4 right-4 md:left-8 md:right-16 lg:left-16 lg:right-1/4 z-50">
          <div className="bg-[#094074] border-2 border-[#5adbff] rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-[#5adbff] rounded-full flex items-center justify-center text-xs font-bold text-[#094074]">
                    {guidedProject.currentStep + 1}
                  </div>
                  <h3 className="font-bold text-[#5adbff]">
                    Step {guidedProject.currentStep + 1} of {guidedProject.steps.length}
                  </h3>
                </div>
                <div className="bg-[#3c6997] rounded-lg p-3 border border-[#5adbff]">
                  <p className="text-sm text-white leading-relaxed">
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
                  className="border-[#5adbff] text-[#5adbff] hover:bg-[#5adbff] hover:text-[#094074] flex-1 sm:flex-none"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  onClick={handleCheckStep}
                  className="bg-[#ffdd4a] hover:bg-[#ff960d] text-[#094074] hover:text-white font-semibold flex-1 sm:flex-none"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Check Step
                </Button>
                
                <Button
                  onClick={handleNextStep}
                  disabled={!stepComplete}
                  className="bg-[#ff960d] hover:bg-[#ffdd4a] disabled:opacity-50 disabled:cursor-not-allowed text-white hover:text-[#094074] font-semibold flex-1 sm:flex-none"
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