'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  IconPlayerPlay,
  IconMessage,
  IconBulb,
  IconCode,
  IconTerminal,
  IconSparkles,
  IconX,
  IconMap,
  IconBolt, 
  IconBrain,
  IconCircleCheck,
  IconArrowRight,
  IconSearch,
  IconCopy,
  IconLoader2,
  IconArrowLeft,
  IconMicrophone,
  IconVideo
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable';
import FileExplorer from '@/components/FileExplorer';
import MonacoEditor from '@/components/MonacoEditor';
import HTMLPreview from '@/components/HTMLPreview';
import RunDropdown from '@/components/RunDropdown';
import TypingIndicator from '@/components/TypingIndicator';
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GuidedStepPopup from '@/components/GuidedStepPopup';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import TavusConversation from '../../components/TavusConversation';
import Image from 'next/image';
import Terminal from '@/components/Terminal';


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
  projectContext?: string;
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

// --- Helper: Recursively get all files ---
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

// --- Helper: Recursively get all folders ---
const getAllFolders = (files: FileNode[]): FileNode[] => {
  const allFolders: FileNode[] = [];
  const traverse = (nodes: FileNode[]) => {
    nodes.forEach(node => {
      if (node.type === 'folder') {
        allFolders.push(node);
        if (node.children) traverse(node.children);
      }
    });
  };
  traverse(files);
  return allFolders;
};

// Move this helper to the top-level of the IDEPage component:
const updateFileInTree = (nodes: FileNode[], fileId: string, newContent: string): FileNode[] => {
  return nodes.map(node => {
    if (node.id === fileId) {
      return { ...node, content: newContent };
    } else if (node.children) {
      return { ...node, children: updateFileInTree(node.children, fileId, newContent) };
    }
    return node;
  });
};

// Move formatCodeInMessage above handleFixCode
function formatCodeInMessage(content: string) {
  // If the content contains 'Original:' and 'Fixed:', format them
  if (/Original:/i.test(content) && /Fixed:/i.test(content)) {
    // Split into lines
    const lines = content.split('\n');
    let formatted = '';
    let inCodeBlock = false;
    lines.forEach((line, idx) => {
      if (/^Original:/i.test(line)) {
        if (inCodeBlock) {
          formatted += '```\n'; // close previous code block
          inCodeBlock = false;
        }
        formatted += `${line}\n`;
        // Next lines are code until 'Fixed:'
        if (lines[idx + 1] && !/^Fixed:/i.test(lines[idx + 1])) {
          formatted += '```python\n';
          inCodeBlock = true;
        }
      } else if (/^Fixed:/i.test(line)) {
        if (inCodeBlock) {
          formatted += '```\n'; // close previous code block
          inCodeBlock = false;
        }
        formatted += `${line}\n`;
        // Next lines are code
        if (lines[idx + 1]) {
          formatted += '```python\n';
          inCodeBlock = true;
        }
      } else if (/^\s*$/.test(line)) {
        if (inCodeBlock) {
          formatted += '```\n';
          inCodeBlock = false;
        }
        formatted += '\n';
      } else {
        formatted += `${line}\n`;
      }
    });
    if (inCodeBlock) {
      formatted += '```\n';
    }
    return formatted;
  }
  return content;
}

function IDEPage() {
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
  // Removed isChatOpen and showChatClosedMessage, chat is always open

  // Guided project state
  const [guidedProject, setGuidedProject] = useState<GuidedProject | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [stepComplete, setStepComplete] = useState(false);
  const [isCheckingStep, setIsCheckingStep] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('editor');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showVideoWarning, setShowVideoWarning] = useState(false);
  const router = useRouter();

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-scroll when typing animation is active
  useEffect(() => {
    if (isTyping) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isTyping]);

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

  // Add state for folder delete confirmation
  const [pendingDeleteFolderId, setPendingDeleteFolderId] = useState<string | null>(null);
  const [pendingDeleteFolderName, setPendingDeleteFolderName] = useState<string | null>(null);

  // Update handleFileDelete to show confirmation for folders
  const handleFileDelete = (fileId: string) => {
    // Find the node to delete
    const findNode = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === fileId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const nodeToDelete = findNode(files);
    if (nodeToDelete && nodeToDelete.type === 'folder') {
      setPendingDeleteFolderId(fileId);
      setPendingDeleteFolderName(nodeToDelete.name);
      return;
    }
    // If not a folder, delete immediately
    actuallyDeleteFile(fileId);
  };

  // Actual delete logic
  const actuallyDeleteFile = (fileId: string) => {
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
    setPendingDeleteFolderId(null);
    setPendingDeleteFolderName(null);
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
      setFiles(updateFileInTree(files, selectedFile.id, value));
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
  const handleSendMessage = async function() {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Prevent sending if no guided project is active
    if (!guidedProject) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please start a guided project before chatting with the assistant. Click "Start Guided Project" at the top to begin!',
        timestamp: new Date()
      }]);
      return;
    }

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
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: '💡 Getting hint...',
      timestamp: new Date()
    }]);
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

  // Add state for editor read-only
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(false);

  const handleFixCode = async () => {
    if (!selectedFile || !selectedFile.content || selectedFile.content.trim().length < 10) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'You need to attempt something substantial for me to fix.',
        timestamp: new Date()
      }]);
      return;
    }

    // Only allow Fix Code if a guided project is active and the current step is not complete
    if (!guidedProject || stepComplete) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Code fixing is only available for the current step of an active guided project.',
        timestamp: new Date()
      }]);
      return;
    }

    // Extract the latest error from output, if any
    let errorMessage = '';
    if (output && output.length > 0) {
      // Look for a line that starts with 'Error:' or contains 'Error'
      const errorLine = output.find(line => /error/i.test(line));
      if (errorLine) {
        errorMessage = errorLine;
      }
    }

    const allowedLanguages = [
      'python', 'javascript', 'java', 'cpp', 'c', 'html', 'css', 'typescript'
    ];
    if (!allowedLanguages.includes(selectedFile.language ?? '')) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Code fixing is only supported for Python, JavaScript, Java, C++, C, HTML, CSS, and TypeScript files.',
        timestamp: new Date()
      }]);
      return;
    }
    if (!errorMessage || errorMessage.trim().length === 0) {
      errorMessage = 'Code is not working as expected.';
    }

    setIsTyping(true);
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: '🛠️ Fixing code...',
      timestamp: new Date()
    }]);
    try {
      // Only send required fields to /api/code/fix
      const body = {
        code: selectedFile.content,
        language: selectedFile.language,
        error_message: errorMessage,
        projectFiles: files
      };
      const response = await fetch('/api/code/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.success && result.fixed_code && result.fixes_applied) {
        // Animate typing the fixed code word by word
        setIsEditorReadOnly(true);
        const oldCode = selectedFile.content;
        const newCode = result.fixed_code;
        const lines = newCode.split('\n');
        let i = 0;
        const animate = () => {
          if (i < lines.length) {
            setSelectedFile({ ...selectedFile, content: lines.slice(0, i + 1).join('\n') });
            i++;
            setTimeout(animate, 80); // Animate by line for better formatting
          } else {
            // Highlight all changed lines
            const fixedLines = result.fixes_applied.map((fix: any) => fix.line_number).filter((line: number) => line);
            setHighlightedLines(fixedLines);
            setIsEditorReadOnly(false);
            // Add the fix message to chat
            let diffMessage = formatCodeInMessage(result.diff);
            if (!diffMessage || diffMessage.trim() === '' || diffMessage.trim() === 'undefined') {
              diffMessage = 'Code is fixed!';
            }
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `🔧 **Code Fix Suggestions**\n\n${diffMessage}`
            }]);
          }
        };
        animate();
        // Also update the file in the files tree after animation
        setTimeout(() => {
          setFiles(updateFileInTree(files, selectedFile.id, newCode));
        }, newCode.length * 6 + 100);
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
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: '📖 Explaining code...',
      timestamp: new Date()
    }]);
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

  // 1. Add a loading state for starting guided project
  const [isStartingProject, setIsStartingProject] = useState(false);
  const [projectStartError, setProjectStartError] = useState<string | null>(null);

  // 2. Update handleStartGuidedProject to set loading state
  const handleStartGuidedProject = async (description: string) => {
    window.console.log('[GUIDE-LOG] handleStartGuidedProject called with:', description);
    setIsStartingProject(true);
    setProjectStartError(null);
    try {
      window.console.log('[GUIDE-LOG] Sending fetch to /api/guided/startProject');
      const response = await fetch('/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectDescription: description,
          projectFiles: files 
        })
      });
      window.console.log('[GUIDE-LOG] Fetch completed, status:', response.status);
      const result = await response.json();
      window.console.log('[GUIDE-LOG] API result:', result);

      if (result.projectId && result.steps) {
        setGuidedProject({
          projectId: result.projectId,
          steps: result.steps,
          currentStep: 0,
          projectContext: result.projectContext
        });

        if (result.welcomeMessage) {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: result.welcomeMessage.content,
            timestamp: new Date()
          }]);
        }
        setShowProjectModal(false); // Only close modal on success
      } else if (result.error) {
        setProjectStartError(result.error);
      } else {
        setProjectStartError('Unknown error starting project.');
      }
    } catch (error) {
      console.error('Error starting guided project:', error);
      setProjectStartError('Network or server error. Please try again.');
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'I\'m ready to help you with your project! Let\'s start by creating some files and writing code together. What would you like to build?',
        timestamp: new Date()
      }]);
    } finally {
      setIsStartingProject(false);
    }
  };

  // Add state to track completed steps
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleCheckStep = async () => {
    console.log('handleCheckStep called', { guidedProject: !!guidedProject, isCheckingStep });
    if (!guidedProject || isCheckingStep) return;
    console.log('Starting step check...');
    setIsCheckingStep(true);
    
    try {
      const currentStep = guidedProject.steps[guidedProject.currentStep];
      console.log('Current step:', currentStep);

      // Check if this step is about creating a file or folder
      const fileCreateMatch = currentStep.instruction.match(/create (an? |the )?(html|css|js|javascript|python)? ?file (called |named )?['"]?([\w\-.]+)['"]?/i);
      const folderCreateMatch = currentStep.instruction.match(/create (an? |the )?folder (called |named )?['"]?([\w\-.]+)['"]?/i);
      const simpleFolderMatch = currentStep.instruction.match(/create (an? |the )?folder/i);

      // Handle file creation steps
      if (fileCreateMatch) {
        const requiredFileName = fileCreateMatch[4];
        const allFiles = getAllFiles(files);
        const fileExists = allFiles.some((f: FileNode) => f.name.toLowerCase() === requiredFileName.toLowerCase());
        
        if (fileExists) {
          setStepComplete(true);
          setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: `✅ Perfect! You've created the file \`${requiredFileName}\`. You can proceed to the next step.`,
            timestamp: new Date()
          }]);
          setIsCheckingStep(false);
          return;
        } else {
          setStepComplete(false);
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: `Please create the file \`${requiredFileName}\` first. Use the "+" button in the file explorer to create a new file.`,
            timestamp: new Date()
          }]);
          setIsCheckingStep(false);
          return;
        }
      }

      // Handle folder creation steps
      if (folderCreateMatch || simpleFolderMatch) {
        const requiredFolderName = folderCreateMatch ? folderCreateMatch[3] : null;
        const allFolders = getAllFolders(files);
        
        if (requiredFolderName) {
          // Named folder creation
          const folderExists = allFolders.some((f: FileNode) => f.name.toLowerCase() === requiredFolderName.toLowerCase());
          if (folderExists) {
            setStepComplete(true);
            setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `✅ Perfect! You've created the folder \`${requiredFolderName}\`. You can proceed to the next step.`,
              timestamp: new Date()
            }]);
            setIsCheckingStep(false);
            return;
          } else {
            setStepComplete(false);
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `Please create the folder \`${requiredFolderName}\` before proceeding. Use the "+" button in the file explorer to create a new folder.`,
              timestamp: new Date()
            }]);
            setIsCheckingStep(false);
            return;
          }
        } else {
          // Simple folder creation
          if (allFolders.length > 0) {
            setStepComplete(true);
            setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: '✅ Great! You\'ve created a folder. You can proceed to the next step.',
              timestamp: new Date()
            }]);
            setIsCheckingStep(false);
            return;
          } else {
            setStepComplete(false);
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: 'Please create a folder before proceeding. Use the "+" button in the file explorer to create a new folder.',
              timestamp: new Date()
            }]);
            setIsCheckingStep(false);
            return;
          }
        }
      }

      // For all other steps (code content), require a file to be selected
      if (!selectedFile) {
        setStepComplete(false);
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: 'Please select a file to check your progress on this step. You can click on any file in the file explorer to select it.',
          timestamp: new Date()
        }]);
        setIsCheckingStep(false);
        return;
      }

      // Use Gemini to analyze the code content for non-file/folder creation steps
      console.log('Calling backend analyzeStep API for code analysis...');
      const response = await fetch('/api/guided/analyzeStep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: guidedProject.projectId,
          stepId: guidedProject.steps[guidedProject.currentStep].id,
          code: selectedFile?.content || '',
          language: selectedFile?.language || 'plaintext',
          projectFiles: files
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Validate the response structure
      if (!result.feedback || !Array.isArray(result.feedback)) {
        throw new Error('Invalid response format from server');
      }

      if (result.chatMessage) {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: result.chatMessage.content,
          timestamp: new Date()
        }]);
      }
      
      const allCorrect = result.feedback.every((f: any) => f.correct) || false;
      setStepComplete(allCorrect);
      if (allCorrect) {
        setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
      }
      
    } catch (checkError) {
      console.error('Error checking step:', checkError);
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `❌ Error checking step: ${checkError instanceof Error ? checkError.message : 'Unknown error'}. We are guessing our API has hit the rate limit - please wait for ~15 seconds before trying again, or contact support if the issue persists.`,
        timestamp: new Date()
      }]);
      setStepComplete(false);
    } finally {
      setIsCheckingStep(false);
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
      // If the previous step is not completed, set stepComplete to false
      setStepComplete(completedSteps.has(prevStepIndex));

      const prevStep = guidedProject.steps[prevStepIndex];
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `Back to step ${prevStepIndex + 1}:\n\n${prevStep.instruction}`,
        timestamp: new Date()
      }]);
    }
  };

  // Only allow moving forward if the current step is complete
  const handleNextStep = () => {
    if (!guidedProject) return;
    if (!stepComplete) {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Please complete the current step before moving to the next one.',
        timestamp: new Date()
      }]);
      return;
    }
    const nextStepIndex = guidedProject.currentStep + 1;
    if (nextStepIndex < guidedProject.steps.length) {
      setGuidedProject({
        ...guidedProject,
        currentStep: nextStepIndex
      });
      setStepComplete(completedSteps.has(nextStepIndex));
      const nextStep = guidedProject.steps[nextStepIndex];
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: `Great job! Now let's move to step ${nextStepIndex + 1}:\n\n${nextStep.instruction}`,
        timestamp: new Date()
      }]);
    } else {
      handleFinishProject();
    }
  };

  // 1. Add a ref for the guided step popup
  const guidedStepRef = useRef<HTMLDivElement>(null);

  // 2. Utility to scroll to the guided step popup
  const scrollToGuidedStep = () => {
    guidedStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  
  const handlePreviousStepWithScroll = () => {
    handlePreviousStep();
    setTimeout(scrollToGuidedStep, 100); 
  };
  const handleCheckStepWithScroll = async () => {
    await handleCheckStep();
    setTimeout(scrollToGuidedStep, 100);
  };
  const handleNextStepWithScroll = () => {
    handleNextStep();
    setTimeout(scrollToGuidedStep, 100);
  };

  const handleStopGuidedProject = () => {
    setGuidedProject(null);
    setChatMessages(prev => [
      ...prev,
      {
        type: 'assistant',
        content: '🛑 Guided project stopped.',
        timestamp: new Date()
      }
    ]);
  };

  // Create separate markdown component configurations
  const regularMarkdownComponents: { [key: string]: React.ElementType } = {
    p: ({ children }) => <p className="mb-4 whitespace-pre-line text-base leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-dark-charcoal">{children}</strong>,
    ul: ({ children }) => <span className="ml-8">{children}</span>,
    li: ({ children }) => <span className="block mb-3">{children}</span>,
    code: ({ inline, children }) =>
      inline ? (
        <code className="bg-light-cream text-medium-coffee px-1 py-0.5 rounded font-mono text-base align-middle inline-block" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</code>
      ) : (
        <span className="inline-block bg-light-cream text-medium-coffee px-1 rounded font-mono text-base align-middle" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</span>
      ),
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-2">{children}</h3>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-medium-coffee pl-4 italic text-medium-coffee mb-2">{children}</blockquote>,
    br: () => <br />,
  };

  const codeFixMarkdownComponents: { [key: string]: React.ElementType } = {
    p: ({ children }) => <p className="mb-4 whitespace-pre-line text-base leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="font-bold text-dark-charcoal">{children}</strong>,
    ul: ({ children }) => <span className="ml-8">{children}</span>,
    li: ({ children }) => <span className="block mb-3">{children}</span>,
    code: ({ inline, children }) =>
      inline ? (
        <code className="bg-light-cream text-medium-coffee px-1 py-0.5 rounded font-mono text-base align-middle inline-block" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</code>
      ) : (
        <div className="relative group">
          <pre className="bg-light-cream text-medium-coffee p-3 rounded-lg overflow-x-auto mb-2 font-mono text-sm whitespace-pre-wrap break-words">
            {children}
          </pre>
          <button
            className="absolute top-2 right-2 bg-medium-coffee text-dark-charcoal rounded px-2 py-1 text-xs opacity-80 hover:opacity-100 transition"
            onClick={() => navigator.clipboard.writeText(children as string)}
            title="Copy code"
          >
            Copy
          </button>
        </div>
      ),
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-2">{children}</h3>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-medium-coffee pl-4 italic text-medium-coffee mb-2">{children}</blockquote>,
    br: () => <br />,
  };

  // Add state for congratulations modal
  const [showCongrats, setShowCongrats] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [recapText, setRecapText] = useState('');
  const [isRecapLoading, setIsRecapLoading] = useState(false);

  const handleFinishProject = async () => {
    setShowCongrats(true);
    setGuidedProject(null);
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: '🎉 Congratulations! You\'ve completed the guided project! You\'re doing amazing!',
      timestamp: new Date()
    }]);
  };

  // Add useEffect to auto-fetch recap when showCongrats is set
  useEffect(() => {
    if (showCongrats) {
      setIsRecapLoading(true);
      setShowRecap(false);
      (async () => {
        try {
          const response = await fetch('/api/guided/recap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectFiles: files,
              chatHistory: chatMessages,
              guidedProject: guidedProject,
              ideCapabilities: 'The IDE is web-based (Cafécode). It supports code editing, file management, and code execution for supported languages (Python, JavaScript, HTML, CSS, etc). It does NOT support running terminal or shell commands, installing packages, or accessing a real OS shell.'
            })
          });
          const result = await response.json();
          setRecapText(result.recap || 'Here is a summary of what you learned!');
          setShowRecap(true);
        } catch (e) {
          setRecapText('Could not fetch recap. Please try again later.');
          setShowRecap(true);
        } finally {
          setIsRecapLoading(false);
        }
      })();
    }
  }, [showCongrats]);

  // Add state to track if the terminal has been initialized
  const [terminalInitialized, setTerminalInitialized] = useState(false);

  // Memoize the Terminal component so it is not remounted on tab switch
  const memoizedTerminal = useMemo(() => <Terminal />, []);

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-light-cream text-dark-charcoal transition-colors duration-300">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-cream-beige bg-light-cream shadow-lg">
    
                 <div className="flex items-center space-x-1">
           <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-cream-beige">
            <IconArrowLeft className="h-5 w-5 text-deep-espresso" />
          </button>
          <div className="w-9 h-9 flex items-center justify-center">
            <Image src="/images/logo-trans.png" alt="Cafécode Logo" width={70} height={70} className="h-9 w-9 object-contain rounded-xl" />
          </div>
              <div className="flex items-center justify-left">
                <h1 className="text-xl font-bold text-deep-espresso">
                Project Brewer
              </h1>
          </div>
          </div>

          <div className="flex items-center space-x-2">
            <RunDropdown 
              files={files} 
              onRunFile={handleRunFile} 
              isRunning={isRunning} 
            />

            {/* Start Guided Project Button - only show if not in a guided project */}
            {!guidedProject && (
              <Button
                onClick={() => {
                  window.console.log('[GUIDE-LOG] Start Guided Project button clicked');
                  setShowProjectModal(true);
                }}
                className="bg-medium-coffee hover:bg-deep-espresso text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <IconSparkles className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Start Guided Project</span>
                <span className="sm:hidden">Guide</span>
              </Button>
            )}

            {/* Stop Guided Project Button */}
            {guidedProject && (
              <Button
                onClick={handleStopGuidedProject}
                variant="outline"
                className="border-medium-coffee text-medium-coffee hover:bg-medium-coffee hover:text-white"
              >
                <IconX className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Stop Guide</span>
                <span className="sm:hidden">Stop</span>
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden relative">
          <ResizablePanelGroup direction="horizontal" className="flex-1 gap-0">
            {/* File Explorer */}
            <ResizablePanel 
              defaultSize={isExplorerCollapsed ? 5 : 20} 
              minSize={isExplorerCollapsed ? 5 : 15}
              maxSize={isExplorerCollapsed ? 5 : 35}
              collapsible={true}
              onCollapse={() => setIsExplorerCollapsed(true)}
              onExpand={() => setIsExplorerCollapsed(false)}
              className="border-0"
            >
              <FileExplorer
                onFileSelect={handleFileSelect}
                selectedFileId={selectedFile?.id || null}
                isCollapsed={isExplorerCollapsed}
                onToggleCollapse={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
                stepProgression={guidedProject && (
                  <GuidedStepPopup
                    instruction={guidedProject.steps[guidedProject.currentStep]?.instruction}
                    isComplete={stepComplete}
                    onNextStep={handleNextStep}
                    onPreviousStep={handlePreviousStep}
                    onCheckStep={handleCheckStep}
                    stepNumber={guidedProject.currentStep + 1}
                    totalSteps={guidedProject.steps.length}
                    isChecking={isCheckingStep}
                    onFinish={handleFinishProject}
                  />
                )}
              />
            </ResizablePanel>

            {/* Editor and Preview */}
            <ResizablePanel 
              defaultSize={isExplorerCollapsed ? 65 : 50} 
              minSize={isExplorerCollapsed ? 45 : 30}
              maxSize={isExplorerCollapsed ? 75 : 70}
              className="border-0"
            >
              <div className={`w-full h-full flex flex-col relative ${isExplorerCollapsed ? 'flex-1' : ''}`}>
                <Tabs value={activeTab} onValueChange={(val) => {
                  setActiveTab(val);
                  if (val === 'terminal') setTerminalInitialized(true);
                }} className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-cream-beige bg-cream-beige">
                    <TabsList className="bg-light-cream border border-cream-beige">
                      <TabsTrigger value="editor" className="data-[state=active]:bg-medium-coffee data-[state=active]:text-light-cream">
                        <IconCode className="mr-2 h-4 w-4" />
                        Editor
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="data-[state=active]:bg-medium-coffee data-[state=active]:text-light-cream">
                        <IconPlayerPlay className="mr-2 h-4 w-4" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="terminal" className="data-[state=active]:bg-medium-coffee data-[state=active]:text-light-cream">
                        <IconTerminal className="mr-2 h-4 w-4" />
                        Terminal
                      </TabsTrigger>
                    </TabsList>

                    {selectedFile && (
                      <div className="flex items-center space-x-2 text-sm text-deep-espresso">
                        <div className="w-2 h-2 bg-deep-espresso rounded-full"></div>
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
                        readOnly={isEditorReadOnly}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-cream-beige/20">
                        <div className="text-center">
                          <IconCode className="h-16 w-16 text-medium-coffee mx-auto mb-4" />
                          <p className="text-deep-espresso text-lg">Create a file to start coding</p>
                          <p className="text-deep-espresso/70 text-sm mt-2">Use the file explorer to create your first file</p>
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
                      <div className="flex items-center justify-center h-full bg-cream-beige/20">
                        <div className="text-center">
                          <IconPlayerPlay className="h-16 w-16 text-medium-coffee mx-auto mb-4" />
                          <p className="text-deep-espresso text-lg">Preview available for HTML files</p>
                          <p className="text-deep-espresso/70 text-sm mt-2">Create an HTML file to see the preview</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Always render the Terminal, but only show it when terminal tab is active */}
                  <div
                    style={{
                      height: '400px', // Increased height
                      width: '100%',
                      background: '#111', // Black background for padding
                      padding: '16px', // Add black padding
                      boxSizing: 'border-box',
                      display: activeTab === 'terminal' ? 'block' : 'none',
                      overflowX: 'auto', // Enable horizontal scroll
                      overflowY: 'auto',
                    }}
                  >
                    {memoizedTerminal}
                  </div>
                  {output && output.length > 0 && activeTab === 'terminal' && (
                    <div className="mt-4 bg-cream-beige rounded-lg p-4 shadow-inner border border-cream-beige">
                      <h4 className="font-semibold mb-2 text-medium-coffee">Previous Output</h4>
                      <pre className="text-sm text-dark-charcoal whitespace-pre-wrap break-words">{output.join('\n')}</pre>
                    </div>
                  )}
                </Tabs>
              </div>
            </ResizablePanel>

            {/* Chat Panel */}
            <ResizablePanel 
              defaultSize={isExplorerCollapsed ? 30 : 35} 
              minSize={isExplorerCollapsed ? 20 : 25}
              maxSize={isExplorerCollapsed ? 35 : 60} 
              style={{ minHeight: '400px', overflow: 'visible', maxWidth: '400px' }}
              className="border-0"
            >
              <div className={`w-full h-full flex flex-col bg-cream-beige border-l border-cream-beige ${isExplorerCollapsed ? 'flex-shrink-0' : ''}`}>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 border-b-2 border-cream-beige bg-light-cream">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-medium-coffee rounded-full flex items-center justify-center">
                      <IconSparkles className="h-4 w-4 text-light-cream" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-deep-espresso">AI Assistant</h3>
                    </div>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={isVoiceMode ? 'voice' : 'text'}
                    onValueChange={(value) => {
                      if (value === 'voice') {
                        if (!guidedProject) {
                          setShowVideoWarning(true);
                          setTimeout(() => setShowVideoWarning(false), 2500);
                          return;
                        }
                        setIsVoiceMode(true);
                      } else if (value === 'text') {
                        setIsVoiceMode(false);
                      }
                    }}
                    className="bg-cream-beige p-1 rounded-lg"
                  >
                    <ToggleGroupItem value="text" aria-label="Toggle text" className="data-[state=on]:bg-medium-coffee data-[state=on]:text-light-cream rounded-md px-2 py-1 hover:bg-cream-beige hover:text-deep-espresso">
                      <IconMessage className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="voice" aria-label="Toggle video" className="data-[state=on]:bg-medium-coffee data-[state=on]:text-light-cream rounded-md px-2 py-1 hover:bg-cream-beige hover:text-deep-espresso">
                      <IconVideo className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                {showVideoWarning && (
                  <div className="bg-red-100 text-red-700 text-center py-2 px-4 text-sm font-semibold">
                    Please start a project before accessing the video assistant.
                  </div>
                )}
                <div className="flex-1 overflow-hidden transition-all duration-300 relative">
                  {/* Chat messages area */}
                  <div className="flex-1 overflow-y-auto px-6 pt-6 pb-0 space-y-4 bg-cream-beige" style={{paddingTop: '2rem', height: 'calc(100% - 160px)'}}>
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-2${idx === 0 ? ' mt-0' : ''}`}
                      >
                        <div className={`max-w-[85%] px-6 py-4 rounded-2xl shadow-lg text-base ${msg.type === 'user' ? 'bg-gradient-to-r from-medium-coffee to-deep-espresso text-light-cream ml-auto' : 'bg-white text-dark-charcoal border-2 border-cream-beige/50 shadow-md'}`}
                          style={idx === 0 ? { marginTop: 0 } : {}}>
                          {msg.type === 'assistant' && (msg.content.includes('substantial') || msg.content.startsWith('🛠️ Fixing code')) ? (
                            <div className="font-semibold text-base">
                              {msg.content}
                            </div>
                          ) : msg.type === 'assistant' && msg.content.startsWith('🔧 **Code Fix Suggestions**') ? (
                            <div className="bg-dark-charcoal text-light-cream p-3 rounded-lg font-mono relative text-base">
                              <ReactMarkdown
                                children={msg.content}
                                remarkPlugins={[remarkGfm]}
                                components={codeFixMarkdownComponents}
                              />
                            </div>
                          ) : msg.type === 'assistant' ? (
                            <div className="text-base">
                              <ReactMarkdown
                                children={msg.content}
                                remarkPlugins={[remarkGfm]}
                                components={regularMarkdownComponents}
                              />
                            </div>
                          ) : (
                            <span className="text-base">{msg.content}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white rounded-2xl px-6 py-4 mr-4 border-2 border-cream-beige/50 shadow-md text-base">
                          <TypingIndicator />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  
                  {/* Voice assistant UI overlay - only covers the messages area */}
                  {isVoiceMode && (
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-cream-beige/50 z-10" style={{height: 'calc(100% - 140px)'}}>
                      {guidedProject ? (
                        <TavusConversation 
                          currentCode={selectedFile?.content || ''}
                          currentLanguage={selectedFile?.language || 'plaintext'}
                          output={output}
                          projectFiles={files}
                          guidedProject={guidedProject}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <IconVideo className="h-16 w-16 text-red-400 mx-auto mb-4" />
                            <p className="text-deep-espresso text-lg font-semibold">Start a project to use the video assistant</p>
                            <p className="text-deep-espresso/70 text-sm mt-2">You must begin a guided project before accessing this feature.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Always show chat input and action buttons at the bottom */}
                  <div className="absolute bottom-0 left-0 right-0 pt-6 pb-5 px-6 border-t border-cream-beige bg-light-cream">
                    <div className="flex space-x-3 items-center">
                      <div className="flex-1 flex space-x-2 items-center">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask me anything"
                          className="flex-1 bg-white border-2 border-medium-coffee/30 rounded-2xl px-3 py-2 text-dark-charcoal placeholder-deep-espresso/70 focus:outline-none focus:ring-2 focus:ring-medium-coffee focus:border-transparent transition-all duration-200 shadow-md h-12 text-base"
                          disabled={false}
                          title=""
                      />
                      <Button
                        onClick={handleSendMessage}
                          disabled={false}
                          className="bg-medium-coffee hover:bg-deep-espresso text-light-cream px-4 py-2 rounded-2xl transition-all duration-200 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg h-12 text-base"
                          title=""
                      >
                          <IconArrowRight className="h-5 w-5" />
                      </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-center mt-4 space-x-3">
                      <Button
                        onClick={handleGetHint}
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-light-cream border-2 border-medium-coffee/30 text-medium-coffee hover:text-deep-espresso px-3 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md text-base"
                        disabled={false}
                        title=""
                      >
                        <IconBulb className="mr-2 h-4 w-4" />
                        Get Hint
                      </Button>
                      <Button
                        onClick={handleFixCode}
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-light-cream border-2 border-medium-coffee/30 text-medium-coffee hover:text-deep-espresso px-3 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md text-base"
                        disabled={false}
                        title=""
                      >
                        <IconBolt className="mr-2 h-4 w-4" />
                        Fix Code
                      </Button>
                      <Button
                        onClick={handleExplainCode}
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-light-cream border-2 border-medium-coffee/30 text-medium-coffee hover:text-deep-espresso px-3 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md text-base"
                        disabled={false}
                        title=""
                      >
                        <IconMessage className="mr-2 h-4 w-4" />
                        Explain
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Project Description Modal */}
        <ProjectDescriptionModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSubmit={(desc) => {
            window.console.log('[GUIDE-LOG] ProjectDescriptionModal submitted with:', desc);
            handleStartGuidedProject(desc);
          }}
          isStartingProject={isStartingProject}
          error={projectStartError}
        ></ProjectDescriptionModal>

        {/* Confirmation Modal */}
        {pendingDeleteFolderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
              <h2 className="text-lg font-bold mb-2 text-gray-900">Delete Folder?</h2>
              <p className="mb-4 text-gray-700">Are you sure you want to delete the folder <span className="font-semibold">{pendingDeleteFolderName}</span> and all its contents?</p>
              <div className="flex justify-center gap-4">
                <button
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                  onClick={() => { setPendingDeleteFolderId(null); setPendingDeleteFolderName(null); }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                  onClick={() => actuallyDeleteFile(pendingDeleteFolderId)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showCongrats && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#f7ecd4] to-[#e7dbc7]">
            <div className="relative flex flex-col items-center max-w-lg w-full p-0 animate-fade-in">
              {/* Celebration Emojis */}
              <div className="flex flex-row items-center justify-center gap-4 mt-8 mb-2">
                <span className="text-7xl drop-shadow-lg animate-bounce-slow">🎉</span>
                <span className="text-8xl drop-shadow-lg animate-pulse">☕️</span>
                <span className="text-7xl drop-shadow-lg animate-bounce-slow">🎊</span>
              </div>
              {/* Title and Subtitle */}
              <h2 className="text-4xl font-extrabold text-deep-espresso mb-2 mt-2 text-center drop-shadow-sm">You finished the project!</h2>
              <p className="text-xl text-medium-coffee mb-6 text-center font-medium">You finished your Cafécode guided project.<br/>Take a sip, celebrate, and keep building! <span className="inline-block">☕️</span></p>
              {/* Congrats Card (no recap) */}
              <div className="w-full bg-white rounded-3xl p-8 shadow-2xl border border-cream-beige flex flex-col items-center mb-6 min-h-[120px]">
                <h3 className="font-extrabold text-2xl mb-3 text-medium-coffee text-center">Congratulations on finishing your Cafécode guided project!</h3>
              </div>
              {/* Close Button */}
              <button
                className="mt-2 mb-8 px-10 py-4 rounded-2xl bg-medium-coffee text-light-cream font-bold text-xl shadow-lg hover:bg-deep-espresso transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-medium-coffee focus:ring-offset-2"
                onClick={() => {
                  setShowCongrats(false);
                  setShowRecap(false);
                  setIsRecapLoading(false);
                  setRecapText('');
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// Wrap export
export default function ProtectedIDEPageWrapper() {
  return <IDEPage />;
}