'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import HTMLPreview from '@/components/HTMLPreview';
import RunDropdown from '@/components/RunDropdown';
import TypingIndicator from '@/components/TypingIndicator';
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import GuidedStepPopup from '@/components/GuidedStepPopup';
import StepsPreviewModal, { PreviewStep } from '@/components/StepsPreviewModal';
import ProjectSetupLoader from '@/components/ProjectSetupLoader';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import TavusConversation from '../../components/TavusConversation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import axios from 'axios';
import { backendUrl } from '@/lib/utils';
import ReactPreview from '@/components/ReactPreview';

const MonacoEditor = dynamic(() => import('@/components/MonacoEditor'), { ssr: false });
const Terminal = dynamic(() => import('@/components/Terminal'), { ssr: false });

// CSS keyframes for shimmer animation
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

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

// Helper: Convert backend recursive file list to FileNode tree (copied from FileExplorer)
function convertBackendFilesToTree(backendFiles: any[]): FileNode[] {
  const rootNode: FileNode = { id: '', name: 'root', type: 'folder', children: [] };

  // Sort files to ensure parents are processed before children and folders before files
  backendFiles.sort((a, b) => {
    const aPathParts = a.name.split('/');
    const bPathParts = b.name.split('/');

    // Prioritize shorter paths (parents) first
    if (aPathParts.length !== bPathParts.length) {
      return aPathParts.length - bPathParts.length;
    }

    // Then prioritize folders over files at the same level
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    
    return a.name.localeCompare(b.name);
  });

  for (const file of backendFiles) {
    const parts = file.name.split('/');
    let currentParent = rootNode;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = (i === parts.length - 1);
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let existingNode = currentParent.children?.find(child => child.name === part);

      if (!existingNode) {
        existingNode = {
          id: currentPath,
          name: part,
          type: (isLastPart && !file.isDirectory) ? 'file' : 'folder',
          children: [],
        };
        if (currentParent.children) {
          currentParent.children.push(existingNode);
        } else {
          currentParent.children = [existingNode];
        }
      }

      if (!isLastPart) {
        currentParent = existingNode;
      } else if (!file.isDirectory) {
        // If it's the last part and it's a file, ensure its type is 'file' and no children
        existingNode.type = 'file';
        existingNode.children = undefined;
      }
    }
  }

  // Recursively remove empty children arrays from files (not folders)
  function cleanTree(node: FileNode): FileNode {
    if (node.type === 'file') {
      return { ...node, children: undefined };
    }
    if (node.children) {
      node.children = node.children.map(cleanTree);
    }
    return node;
  }

  return rootNode.children || [];
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
  const [filesError, setFilesError] = useState<string | null>(null);
  // Setup (pre-steps) state
  const [isInSetupPhase, setIsInSetupPhase] = useState(false);
  const [setupDescription, setSetupDescription] = useState<string>('');
  const [ignoreIncomingSetupResponses, setIgnoreIncomingSetupResponses] = useState(false);
  const [showStepsPreviewModal, setShowStepsPreviewModal] = useState(false);
  const [previewSteps, setPreviewSteps] = useState<PreviewStep[]>([]);
  const [originalSteps, setOriginalSteps] = useState<PreviewStep[]>([]);
  const [isStartingFromSteps, setIsStartingFromSteps] = useState(false);
  const [stepsFlowError, setStepsFlowError] = useState<string | null>(null);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('editor');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showVideoWarning, setShowVideoWarning] = useState(false);
  const router = useRouter();
  const { session } = useAuth();

  // Helper to get auth headers (inline from FileExplorer)
  const getAuthHeaders = () => {
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchFiles = useCallback(async () => {
    if (!session?.access_token) {
      setFilesError('Authentication required');
      return;
    }
      
    setFilesError(null);
    try {
      const res = await axios.get(`${backendUrl}/files/list?recursive=true`, {
        headers: getAuthHeaders()
      });
      // Adapt backend data to FileNode[]
      const nodes = convertBackendFilesToTree(res.data.files);
      setFiles(nodes);
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      setFilesError(err.response?.data?.error || err.message || 'Failed to load files');
    }
  }, [session]);

  // Deep scan helper: returns a flat list of files with optional content
  const scanWorkspace = useCallback(async (opts?: { includeContent?: boolean; extensions?: string[] }) => {
    if (!session?.access_token) throw new Error('Authentication required');
    const params = new URLSearchParams();
    params.set('path', '.');
    params.set('recursive', 'true');
    params.set('includeContent', opts?.includeContent ? 'true' : 'false');
    params.set('ignoreHidden', 'true');
    if (opts?.extensions && opts.extensions.length > 0) {
      params.set('extensions', opts.extensions.join(','));
    }
    const res = await axios.get(`${backendUrl}/files/scan?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    // returns { exists, isDirectory, files: [{ name, isDirectory, size, modified, content? }] }
    return res.data;
  }, [session]);

  // Heuristic: decide whether a step requires checking file presence or contents
  const analyzeStepAgainstScan = (instruction: string, scan: any) => {
    const lowered = instruction.toLowerCase();
    const fileRegex = /(file|in|open|update|edit|modify)\s+['\"]?([\w\-/]+?\.(?:js|ts|tsx|jsx|py|html|css|json|md|yaml|yml))['\"]?/i;
    const dockerRegex = /(dockerfile)/i;
    let targetFile: string | null = null;
    const m = instruction.match(fileRegex);
    if (m && m[2]) targetFile = m[2];
    else if (dockerRegex.test(instruction)) targetFile = 'Dockerfile';

    const isCreateIntent = /(create|make|new)\s+(file|folder)/i.test(instruction);
    const isFolderIntent = /(create|make|new).*folder/i.test(instruction);
    const isModifyIntent = /(add|write|update|modify|implement|insert|replace|append)\b/i.test(instruction);

    const allItems: any[] = Array.isArray(scan?.files) ? scan.files : [];
    const filesList = allItems.filter(item => !item.isDirectory);
    const directoriesList = allItems.filter(item => item.isDirectory);
    
    // Improved folder name extraction with multiple patterns
    let folderName: string | null = null;
    if (isFolderIntent) {
      // Try multiple patterns to extract folder name
      const patterns = [
        /folder\s+(?:called|named)?\s*['"`]?([\w\-\/\.]+)['"`]?/i,
        /(?:called|named)\s+['"`]?([\w\-\/\.]+)['"`]?/i,
        /['"`]([\w\-\/\.]+)['"`]/i,
        /\s([\w\-\.]+)\s*(?:folder|directory)/i,
        /folder\s+([\w\-\.]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = instruction.match(pattern);
        if (match && match[1]) {
          folderName = match[1].replace(/^\.\/?/, '').replace(/['"``]/g, '');
          break;
        }
      }
      
      // Debug logging
      console.log('🔍 Folder detection:', {
        instruction,
        isFolderIntent,
        folderName,
        availableDirectories: directoriesList.map(d => d.name)
      });
      
      if (folderName) {
        // More flexible existence check
        const exists = directoriesList.some((f) => {
          const dirName = f.name.toLowerCase();
          const targetName = folderName!.toLowerCase();
          return dirName === targetName || 
                 dirName.endsWith('/' + targetName) || 
                 dirName.endsWith('\\' + targetName) ||
                 dirName.includes(targetName);
        });
        
        console.log('🔍 Folder existence check:', {
          folderName,
          exists,
          directoriesList: directoriesList.map(d => ({ name: d.name, path: d.path }))
        });
        
        return { type: 'folder', exists, file: folderName, tokensChecked: [] };
      } else {
        // Folder intent detected but couldn't extract specific name
        console.log('⚠️ Folder intent detected but no specific folder name found:', instruction);
        return { type: 'folder', exists: false, file: 'required folder', tokensChecked: [] };
      }
    }

    if (!targetFile) {
      // Check if this is a file creation step without explicit filename
      if (isCreateIntent && !isFolderIntent) {
        // This is a file creation step but we couldn't extract the filename
        // Look for common file creation patterns
        const fileCreateMatch = instruction.match(/(?:create|make|new)\s+(?:an?\s+)?(?:html|css|js|javascript|python|file)\s+(?:called\s+|named\s+)?['"]?([\w\-\.]+)['"]?/i);
        if (fileCreateMatch && fileCreateMatch[1]) {
          const fileName = fileCreateMatch[1];
          // Check if file exists
          const exists = filesList.some((f) => f.name.toLowerCase().endsWith('/' + fileName.toLowerCase()) || f.name.toLowerCase() === fileName.toLowerCase());
          return { type: 'file-create', exists, file: fileName, tokensChecked: [] };
        }
        // Generic file creation without specific name
        return { type: 'file-create', exists: false, file: 'new file', tokensChecked: [] };
      }
      // fall back: if no explicit file, consider presence of any files changed later; for now, no hard check
      return { type: 'generic', exists: true, file: null, tokensChecked: [] };
    }

    // Normalize path comparisons by ending with file name
    const existsIdx = filesList.findIndex((f) => f.name.toLowerCase().endsWith('/' + targetFile!.toLowerCase()) || f.name.toLowerCase() === targetFile!.toLowerCase());
    const exists = existsIdx !== -1;
    const fileItem = exists ? filesList[existsIdx] : null;

    if (isCreateIntent) {
      return { type: 'file-create', exists, file: targetFile, tokensChecked: [] };
    }

    if (isModifyIntent) {
      if (!exists || !fileItem) return { type: 'file-modify', exists: false, file: targetFile, tokensChecked: [] };
      // Try to extract quoted tokens from instruction to search within file
      const tokenRegex = /['`\"]([^'"`]{3,})['`\"]/g;
      const tokens: string[] = [];
      let tm: RegExpExecArray | null;
      while ((tm = tokenRegex.exec(instruction)) && tokens.length < 3) {
        tokens.push(tm[1]);
      }
      if (tokens.length === 0) {
        // fallback: search for common markers like function or class names keywords present in instruction
        const wordCandidates = instruction
          .replace(/[^A-Za-z0-9_\-\.\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !/(create|file|folder|update|modify|insert|write|add|open|edit|into|the|and|with|for|html|css|javascript|python)/i.test(w))
          .slice(0, 2);
        tokens.push(...wordCandidates);
      }
      const content: string = fileItem.content || '';
      const hits = tokens.filter((t) => t && content.toLowerCase().includes(t.toLowerCase()));
      const ok = hits.length > 0 || content.trim().length > 0; // minimal safeguard
      return { type: 'file-modify', exists: ok, file: targetFile, tokensChecked: tokens };
    }

    // Default: if a file is referenced but not a create intent, ensure it exists
    return { type: 'file-reference', exists, file: targetFile, tokensChecked: [] };
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchFiles();
    }
  }, [session, fetchFiles]);


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
  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'file') {
      // Prevent reloading if already selected
      if (selectedFile && selectedFile.id === file.id) return;
      
      try {
        const res = await axios.get(`${backendUrl}/files/read`, {
          params: { path: file.id },
          headers: getAuthHeaders(),
        });
        const content = res.data.data;
        const language = getLanguageFromFileName(file.name);
        const fileWithContent = { ...file, content, language };
        setSelectedFile(fileWithContent);
      } catch (err) {
        console.error('Failed to read file:', err);
        // Handle error, e.g., show a notification to the user
      }
    }
  };

  const buildPathFromId = (parentId: string | null, name: string): string => {
    if (!parentId || parentId === '.' || parentId === '/') return name;
    return parentId + '/' + name;
  };
  
  const handleFileCreate = async (parentId: string | null, type: 'file' | 'folder', name: string) => {
    try {
      await axios.post(`${backendUrl}/files/create`, 
        { path: buildPathFromId(parentId, name), isFolder: type === 'folder' },
        { headers: getAuthHeaders() }
      );
      fetchFiles(); // Refetch files to update the tree
    } catch (err: any) {
      console.error('Failed to create:', err);
      // Optionally, set an error state to show in the UI
    }
  };

  // Add state for folder delete confirmation
  const [pendingDeleteFolderId, setPendingDeleteFolderId] = useState<string | null>(null);
  const [pendingDeleteFolderName, setPendingDeleteFolderName] = useState<string | null>(null);

  // Update handleFileDelete to show confirmation for folders
  const handleDeleteRequest = (fileId: string) => {
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
    handleFileDelete(fileId);
  };

  // Actual delete logic
  const handleFileDelete = async (fileId: string) => {
    try {
      await axios.delete(`${backendUrl}/files/delete`, { 
        data: { path: fileId },
        headers: getAuthHeaders()
      });
      fetchFiles(); // Refetch to update the tree
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
    } catch (err: any) {
      console.error('Failed to delete:', err);
      // Optionally, set an error state
    } finally {
      setPendingDeleteFolderId(null);
      setPendingDeleteFolderName(null);
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

    // Setup phase routing
    if (isInSetupPhase) {
      setIsTyping(true);
      let result: any;
      try {
        const response = await fetch('/api/guided/setup/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ projectDescription: setupDescription, history: [...chatMessages, userMessage], projectFiles: files })
        });
        result = await response.json();
        if (!ignoreIncomingSetupResponses && result?.response?.content) {
          setChatMessages(prev => [...prev, { type: 'assistant', content: result.response.content, timestamp: new Date() }]);
          
          // Handle delayed next question if provided
          if (result.nextQuestion && result.nextQuestion.content) {
            // Show typing indicator for the delay duration
            setIsTyping(true);
            setTimeout(() => {
              setIsTyping(false);
              setChatMessages(prev => [...prev, { 
                type: 'assistant', 
                content: result.nextQuestion.content, 
                timestamp: new Date() 
              }]);
            }, result.nextQuestion.delay || 1000);
          } else {
            setIsTyping(false);
          }
        } else {
          setIsTyping(false);
        }
      } catch (error) {
        if (!ignoreIncomingSetupResponses) {
          setChatMessages(prev => [...prev, { type: 'assistant', content: 'I\'ve noted your preferences. What else should we refine before generating steps?', timestamp: new Date() }]);
        }
        setIsTyping(false);
      } finally {
        // Only set typing to false if we don't have a delayed question
        if (!result?.nextQuestion) {
          setIsTyping(false);
        }
      }
      return;
    }

    // Normal chat requires an active guided project
    if (!guidedProject) {
      setChatMessages(prev => [...prev, { type: 'assistant', content: 'Please start a guided project before chatting with the assistant. Click "Start Guided Project" at the top to begin!', timestamp: new Date() }]);
      return;
    }

    setIsTyping(true);
    let result: any = null;
    try {
      const response = await fetch('/api/guided/simple-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          history: [...chatMessages, userMessage],
          projectFiles: files,
          guidedProject: guidedProject,
          currentCode: selectedFile?.content || '',
          currentLanguage: selectedFile?.language || 'plaintext'
        })
      });
      result = await response.json();
      if (result.response) {
        setChatMessages(prev => [...prev, { type: 'assistant', content: result.response.content, timestamp: new Date() }]);
        
        // Handle delayed next question if provided (like in setup flow)
        if (result.nextQuestion && result.nextQuestion.content) {
          // Show typing indicator for the delay duration
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setChatMessages(prev => [...prev, { 
              type: 'assistant', 
              content: result.nextQuestion.content, 
              timestamp: new Date() 
            }]);
          }, result.nextQuestion.delay || 1500);
        } else {
          setIsTyping(false);
        }
      } else {
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error in simple chat:', error);
      
      // Try to get a helpful response from Gemini even if the main chat failed
      try {
        const fallbackResponse = await fetch('/api/guided/simple-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            history: [{ type: 'user', content: 'I encountered an error. Please provide a helpful response to help me continue.', timestamp: new Date() }],
            projectFiles: files,
            guidedProject: guidedProject,
            currentCode: selectedFile?.content || '',
            currentLanguage: selectedFile?.language || 'plaintext'
          })
        });
        
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.response) {
            setChatMessages(prev => [...prev, { type: 'assistant', content: fallbackResult.response.content, timestamp: new Date() }]);
          }
        } else {
          // If even the fallback fails, provide a generic helpful message
          const fallbackMessage: ChatMessage = { 
            type: 'assistant', 
            content: "I'm having trouble processing your request right now. Let me try a different approach - could you rephrase your question or try asking something specific about your code?", 
            timestamp: new Date() 
          };
          setChatMessages(prev => [...prev, fallbackMessage]);
        }
      } catch (fallbackError) {
        console.error('Fallback chat also failed:', fallbackError);
        const fallbackMessage: ChatMessage = { 
          type: 'assistant', 
          content: "I'm experiencing some technical difficulties. Please try refreshing the page or ask your question again in a moment.", 
          timestamp: new Date() 
        };
        setChatMessages(prev => [...prev, fallbackMessage]);
      }
    } finally {
      // Only set typing to false if we don't have a delayed question
      if (!result?.nextQuestion) {
        setIsTyping(false);
      }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
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
      console.error('Error getting hint:', error);
      
      // Try to get a helpful hint response from Gemini even if the hint API failed
      try {
        const fallbackHintResponse = await fetch('/api/guided/simple-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            history: [{ 
              type: 'user', 
              content: `I need a hint for my ${selectedFile.language} code. Here's what I'm working on: ${guidedProject?.steps[guidedProject.currentStep]?.instruction || 'coding problem'}. Can you give me a helpful hint?`, 
              timestamp: new Date() 
            }],
            projectFiles: files,
            guidedProject: guidedProject,
            currentCode: selectedFile.content,
            currentLanguage: selectedFile.language
          })
        });
        
        if (fallbackHintResponse.ok) {
          const fallbackResult = await fallbackHintResponse.json();
          if (fallbackResult.response) {
            setChatMessages(prev => [...prev, { 
              type: 'assistant', 
              content: `💡 **Hint**: ${fallbackResult.response.content}`, 
              timestamp: new Date() 
            }]);
          }
        } else {
          // If even the fallback fails, provide a generic helpful hint
          const fallbackHint: ChatMessage = { 
            type: 'assistant', 
            content: "💡 **Hint**: Try breaking down your problem into smaller steps. Look for any syntax errors first, then check your logic flow!", 
            timestamp: new Date() 
          };
          setChatMessages(prev => [...prev, fallbackHint]);
        }
      } catch (fallbackError) {
        console.error('Fallback hint also failed:', fallbackError);
        const fallbackHint: ChatMessage = { 
          type: 'assistant', 
          content: "💡 **Hint**: Try breaking down your problem into smaller steps. Look for any syntax errors first, then check your logic flow!", 
          timestamp: new Date() 
        };
        setChatMessages(prev => [...prev, fallbackHint]);
      }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
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
            
            // Get a summary of the changes from Gemini after animation completes
            (async () => {
              try {
                const summaryResponse = await fetch('/api/guided/simple-chat', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                  },
                  body: JSON.stringify({ 
                    history: [{ 
                      type: 'user', 
                      content: `Summarize the code changes that were made. Here are the details: ${result.diff}. Please provide a clear, concise summary of what was fixed in bullet points.`, 
                      timestamp: new Date() 
                    }],
                    projectFiles: files,
                    guidedProject: guidedProject,
                    currentCode: selectedFile.content,
                    currentLanguage: selectedFile.language
                  })
                });
                
                if (summaryResponse.ok) {
                  const summaryResult = await summaryResponse.json();
                  if (summaryResult.response) {
                    setChatMessages(prev => [...prev, {
                      type: 'assistant',
                      content: `Here are the changes:\n\n${summaryResult.response.content}`
                    }]);
                  } else {
                    // Fallback to simple message if Gemini response is empty
                    setChatMessages(prev => [...prev, {
                      type: 'assistant',
                      content: `Here are the changes:\n\n**• Code has been fixed and improved**`
                    }]);
                  }
                } else {
                  // Fallback if Gemini call fails
                  setChatMessages(prev => [...prev, {
                    type: 'assistant',
                    content: `Here are the changes:\n\n**• Code has been fixed and improved**`
                  }]);
                }
              } catch (summaryError) {
                console.error('Error getting change summary:', summaryError);
                // Fallback if Gemini call fails
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  content: `Here are the changes:\n\n**• Code has been fixed and improved**`
                }]);
              }
            })();
          }
        };
        animate();
        // Also update the file in the files tree after animation
        setTimeout(() => {
          setFiles(updateFileInTree(files, selectedFile.id, newCode));
        }, newCode.length * 6 + 100);
      }
    } catch (error) {
      console.error('Error fixing code:', error);
      
      // Try to get a helpful code review response from Gemini even if the fix API failed
      try {
        const fallbackFixResponse = await fetch('/api/guided/simple-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            history: [{ 
              type: 'user', 
              content: `I need help reviewing my ${selectedFile.language} code. Here's what I'm working on: ${guidedProject?.steps[guidedProject.currentStep]?.instruction || 'coding problem'}. Can you review my code and give me some helpful tips?`, 
              timestamp: new Date() 
            }],
            projectFiles: files,
            guidedProject: guidedProject,
            currentCode: selectedFile.content,
            currentLanguage: selectedFile.language
          })
        });
        
        if (fallbackFixResponse.ok) {
          const fallbackResult = await fallbackFixResponse.json();
          if (fallbackResult.response) {
            setChatMessages(prev => [...prev, { 
              type: 'assistant', 
              content: `🔧 **Code Review**: ${fallbackResult.response.content}`, 
              timestamp: new Date() 
            }]);
          }
        } else {
          // If even the fallback fails, provide a generic helpful code review
          const fallbackReview: ChatMessage = { 
            type: 'assistant', 
            content: '🔧 **Code Review**: Your code looks good! Here are some general tips:\n\n• Check for proper indentation\n• Use meaningful variable names\n• Add comments for complex logic\n• Test your code with different inputs', 
            timestamp: new Date() 
          };
          setChatMessages(prev => [...prev, fallbackReview]);
        }
      } catch (fallbackError) {
        console.error('Fallback code review also failed:', fallbackError);
        const fallbackReview: ChatMessage = { 
          type: 'assistant', 
          content: '🔧 **Code Review**: Your code looks good! Here are some general tips:\n\n• Check for proper indentation\n• Use meaningful variable names\n• Add comments for complex logic\n• Test your code with different inputs', 
          timestamp: new Date() 
        };
        setChatMessages(prev => [...prev, fallbackReview]);
      }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
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
      console.error('Error explaining code:', error);
      
      // Try to get a helpful code explanation response from Gemini even if the explain API failed
      try {
        const fallbackExplainResponse = await fetch('/api/guided/simple-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ 
            history: [{ 
              type: 'user', 
              content: `I need help understanding my ${selectedFile.language} code. Here's what I'm working on: ${guidedProject?.steps[guidedProject.currentStep]?.instruction || 'coding problem'}. Can you explain what this code does and give me some helpful insights?`, 
              timestamp: new Date() 
            }],
            projectFiles: files,
            guidedProject: guidedProject,
            currentCode: selectedFile.content,
            currentLanguage: selectedFile.language
          })
        });
        
        if (fallbackExplainResponse.ok) {
          const fallbackResult = await fallbackExplainResponse.json();
          if (fallbackResult.response) {
            setChatMessages(prev => [...prev, { 
              type: 'assistant', 
              content: `📚 **Code Explanation**: ${fallbackResult.response.content}`, 
              timestamp: new Date() 
            }]);
          }
        } else {
          // If even the fallback fails, provide a generic helpful code explanation
          const fallbackExplanation: ChatMessage = { 
            type: 'assistant', 
            content: `📚 **Code Explanation**:\n\nThis ${selectedFile.language} code appears to be well-structured. Here's what it does:\n\n• Defines functions and variables\n• Implements logic for your application\n• Uses proper ${selectedFile.language} syntax\n\nWould you like me to explain any specific part in more detail?`, 
            timestamp: new Date() 
          };
          setChatMessages(prev => [...prev, fallbackExplanation]);
        }
      } catch (fallbackError) {
        console.error('Fallback code explanation also failed:', fallbackError);
        const fallbackExplanation: ChatMessage = { 
          type: 'assistant', 
          content: `📚 **Code Explanation**:\n\nThis ${selectedFile.language} code appears to be well-structured. Here's what it does:\n\n• Defines functions and variables\n• Implements logic for your application\n• Uses proper ${selectedFile.language} syntax\n\nWould you like me to explain any specific part in more detail?`, 
          timestamp: new Date() 
        };
        setChatMessages(prev => [...prev, fallbackExplanation]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  // 1. Add a loading state for starting guided project
  const [isStartingProject, setIsStartingProject] = useState(false);
  const [projectStartError, setProjectStartError] = useState<string | null>(null);
  const [isReactProject, setIsReactProject] = useState(false);

  // 2. Update handleStartGuidedProject to set loading state
  const handleStartGuidedProject = async (description: string) => {
    window.console.log('[GUIDE-LOG] handleStartGuidedProject (deprecated) called with:', description);
    setProjectStartError('Please use the setup flow.');
  };

  // New setup flow: start follow-up chat
  const handleStartProjectSetup = async (description: string) => {
    window.console.log('[GUIDE-LOG] handleStartProjectSetup called with:', description);
    setIsStartingProject(true);
    setProjectStartError(null);
    setIsReactProject(/react|react\.js|reactjs/i.test(description));
    setSetupDescription(description);
    // Don't set isInSetupPhase yet - wait until questions are generated
    setIgnoreIncomingSetupResponses(false);
    try {
      const response = await fetch('/api/guided/setup/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ projectDescription: description, projectFiles: files })
      });
      const result = await response.json();
      setShowProjectModal(false);
      if (result?.response?.content) {
        setChatMessages(prev => [...prev, { type: 'assistant', content: result.response.content, timestamp: new Date() }]);
        // Now set isInSetupPhase after questions are generated and loading is done
        setIsInSetupPhase(true);
      } else if (result?.error) {
        setChatMessages(prev => [...prev, { type: 'assistant', content: 'Let\'s clarify your idea with a few questions:\n1) What are the core features you want?\n2) Which technologies do you prefer?\n3) Any constraints or deadlines?\n4) Who is this for, and what\'s the simplest MVP?', timestamp: new Date() }]);
        // Set isInSetupPhase even on error to maintain consistency
        setIsInSetupPhase(true);
      }
    } catch (error) {
      console.error('Error starting setup flow:', error);
      setProjectStartError('Failed to start setup. Please try again.');
      // Set isInSetupPhase on error to maintain consistency
      setIsInSetupPhase(true);
    } finally {
      setIsStartingProject(false);
    }
  };

  // Generate steps from the setup chat
  const handleSubmitAndGenerateSteps = async () => {
    setStepsFlowError(null);
    setIgnoreIncomingSetupResponses(true);
    setIsTyping(false);
    setIsGeneratingSteps(true);
    try {
      const response = await fetch('/api/guided/steps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectDescription: setupDescription, history: chatMessages, projectFiles: files })
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result.steps)) {
        // Store the original steps for comparison later
        setOriginalSteps(result.steps);
        setPreviewSteps(result.steps);
        setShowStepsPreviewModal(true);
        setIsInSetupPhase(false);
      } else {
        setStepsFlowError(result?.error || 'An error happened. Please try again.');
      }
    } catch (e) {
      setStepsFlowError('An error happened. Please try again.');
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  // Confirm and start the guided project from cleaned steps
  const handleConfirmStartProjectFromSteps = async () => {
    setStepsFlowError(null);
    setIsStartingFromSteps(true);
    try {
      // Get the original steps that were generated from setup
      const originalStepsData = originalSteps;
      
      // Find which steps have been modified by the user
      const modifiedSteps = previewSteps.filter((step, index) => {
        // Check if the step instruction has been changed from the original
        const originalStep = originalStepsData[index];
        return originalStep && step.instruction !== originalStep.instruction;
      });
      
      let finalSteps = previewSteps;
      
      // Only clean up modified steps if there are any
      if (modifiedSteps.length > 0) {
        console.log('[STEPS] Cleaning up', modifiedSteps.length, 'modified steps');
        
        const cleanupResponse = await fetch('/api/guided/steps/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ 
            projectDescription: setupDescription, 
            originalSteps: originalStepsData,
            modifiedSteps: modifiedSteps,
            projectFiles: files
          })
        });
        
        if (cleanupResponse.ok) {
          const cleanupResult = await cleanupResponse.json();
          if (Array.isArray(cleanupResult.steps)) {
            finalSteps = cleanupResult.steps;
            console.log('[STEPS] Steps cleaned up successfully');
          }
        } else {
          console.warn('[STEPS] Cleanup failed, using original steps');
        }
      } else {
        console.log('[STEPS] No modified steps, using original steps as-is');
      }
      
      // Start the project with the final steps
      const projectResponse = await fetch('/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectDescription: setupDescription, projectFiles: files, steps: finalSteps })
      });
      const projectResult = await projectResponse.json();
      if (projectResponse.ok && projectResult.projectId && Array.isArray(projectResult.steps)) {
        setGuidedProject({ projectId: projectResult.projectId, steps: projectResult.steps, currentStep: 0, projectContext: projectResult.projectContext });
        if (projectResult.welcomeMessage) {
          setChatMessages(prev => [...prev, { type: 'assistant', content: projectResult.welcomeMessage.content, timestamp: new Date() }]);
        }
        setShowStepsPreviewModal(false);
      } else {
        setStepsFlowError(projectResult?.error || 'An error happened. Please try again.');
      }
    } catch (e) {
      console.error('[STEPS] Error starting project:', e);
      setStepsFlowError('An error happened. Please try again.');
    } finally {
      setIsStartingFromSteps(false);
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

      // Use deep scan so we know when to check for existence vs contents
      let scanResult: any = null;
      try {
        scanResult = await scanWorkspace({ includeContent: true });
      } catch (err) {
        console.error('Failed to scan workspace, falling back to structure list:', err);
        // Fallback to structure-only if deep scan fails
        try {
          const res = await axios.get(`${backendUrl}/files/list?recursive=true`, { headers: getAuthHeaders() });
          scanResult = { files: res.data.files };
        } catch (e2) {
          scanResult = { files };
        }
      }

      // Use AI-powered analysis to understand what type of step this is
      const analysis = analyzeStepAgainstScan(currentStep.instruction, scanResult);
      
      // Validate that file/folder creation steps have specific names
      if (analysis.type === 'file-create' && (!analysis.file || analysis.file === 'new file')) {
        console.warn('⚠️ File creation step missing specific filename:', currentStep.instruction);
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: '⚠️ This step is missing a specific filename. Please contact support to fix this step.',
          timestamp: new Date()
        }]);
        setIsCheckingStep(false);
        return;
      }
      
      if (analysis.type === 'folder' && (!analysis.file || analysis.file === 'required folder')) {
        console.warn('⚠️ Folder creation step missing specific folder name:', currentStep.instruction);
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: '⚠️ This step is missing a specific folder name. Please contact support to fix this step.',
          timestamp: new Date()
        }]);
        setIsCheckingStep(false);
        return;
      }
      
      // Log analysis results to terminal for debugging
      console.log('🔍 Step Analysis:', {
        instruction: currentStep.instruction,
        analysis: analysis,
        scanResult: {
          totalItems: scanResult.files?.length || 0,
          directories: scanResult.files?.filter((f: any) => f.isDirectory)?.length || 0,
          files: scanResult.files?.filter((f: any) => !f.isDirectory)?.length || 0
        }
      });
      
      // Also log to terminal output if terminal tab is active
      if (activeTab === 'terminal') {
        setOutput(prev => [...prev, 
          `🔍 Step Analysis: ${currentStep.instruction}`,
          `   Type: ${analysis.type}`,
          `   Target: ${analysis.file || 'N/A'}`,
          `   Exists: ${analysis.exists}`,
          `   Tokens Checked: ${analysis.tokensChecked?.join(', ') || 'None'}`
        ]);
      }


      // Handle different step types based on AI analysis
      switch (analysis.type) {
        case 'folder':
          if (analysis.exists) {
            setStepComplete(true);
            setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `✅ Perfect! You've created the folder \`${analysis.file || 'required folder'}\`. You can proceed to the next step.`,
              timestamp: new Date()
            }]);
          } else {
            setStepComplete(false);
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `Please create the folder \`${analysis.file || 'required folder'}\` before proceeding. Use the "+" button in the file explorer to create a new folder.`,
              timestamp: new Date()
            }]);
          }
          setIsCheckingStep(false);
          return;

        case 'file-create':
          if (analysis.exists) {
            setStepComplete(true);
            setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `✅ Perfect! You've created the file \`${analysis.file}\`. You can proceed to the next step.`,
              timestamp: new Date()
            }]);
          } else {
            setStepComplete(false);
            if (analysis.file === 'new file') {
              setChatMessages(prev => [...prev, {
                type: 'assistant',
                content: 'Please create a new file before proceeding. Use the "+" button in the file explorer to create a new file.',
                timestamp: new Date()
              }]);
            } else {
              setChatMessages(prev => [...prev, {
                type: 'assistant',
                content: `Please create the file \`${analysis.file}\` before proceeding. Use the "+" button in the file explorer to create a new file.`,
                timestamp: new Date()
              }]);
            }
          }
          setIsCheckingStep(false);
          return;

        case 'file-reference':
          if (analysis.exists) {
            setStepComplete(true);
            setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `✅ Perfect! The file \`${analysis.file}\` exists. You can proceed to the next step.`,
              timestamp: new Date()
            }]);
          } else {
            setStepComplete(false);
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `Please ensure the file \`${analysis.file}\` exists before proceeding.`,
              timestamp: new Date()
            }]);
          }
          setIsCheckingStep(false);
          return;

        case 'file-modify':
          if (analysis.exists) {
            setStepComplete(true);
            setCompletedSteps(prev => new Set(prev).add(guidedProject.currentStep));
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `✅ Perfect! The file \`${analysis.file}\` has been modified with the expected content. You can proceed to the next step.`,
              timestamp: new Date()
            }]);
          } else {
            setStepComplete(false);
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: `Please modify the file \`${analysis.file}\` with the required content before proceeding.`,
              timestamp: new Date()
            }]);
          }
          setIsCheckingStep(false);
          return;

        case 'generic':
          // For generic steps, we'll proceed to content analysis
          break;

        default:
          console.warn('Unknown step type:', analysis.type);
          break;
      }



      // Handle different step types appropriately
      if (analysis.type === 'file-create' || analysis.type === 'folder' || analysis.type === 'file-reference') {
        // These steps are complete - we've already checked existence
        setIsCheckingStep(false);
        return;
      } else if (analysis.type === 'file-modify' || analysis.type === 'generic') {
        // These steps need content analysis, so we need a selected file
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
      } else {
        // Unknown step type - log warning and proceed with content analysis
        console.warn('Unknown step type, proceeding with content analysis:', analysis.type);
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
      }

      // Use Gemini to analyze the code content for non-file/folder creation steps
      console.log('Calling backend analyzeStep API for code analysis...');
      const response = await fetch('/api/guided/analyzeStep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
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
    // DEMO MODE: Commented out to allow skipping steps
    // if (!stepComplete) {
    //   setChatMessages(prev => [...prev, {
    //     type: 'assistant',
    //     content: 'Please complete the current step before moving to the next one.',
    //     timestamp: new Date()
    //   }]);
    //   return;
    // }
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
    p: ({ children }) => <p className="mb-3 whitespace-pre-line text-base leading-relaxed text-dark-charcoal">{children}</p>,
    strong: ({ children }) => {
      const text = React.Children.toArray(children).join('');
      // Check if the text is a "Question X of Y" label
      if (/^Question \d+ of \d+:$/.test(text)) {
        return <strong className="font-bold text-[#4A3A2A] block mb-2">{children}</strong>;
      }
      return <strong className="font-semibold text-deep-espresso">{children}</strong>;
    },
    ul: ({ children }) => <ul className="ml-6 space-y-2">{children}</ul>,
    li: ({ children }) => <li className="text-dark-charcoal leading-relaxed">{children}</li>,
    code: ({ inline, children }) =>
      inline ? (
        <code className="bg-light-cream text-medium-coffee px-1 py-0.5 rounded font-mono text-base align-middle inline-block" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</code>
      ) : (
        <span className="inline-block bg-light-cream text-medium-coffee px-1 rounded font-mono text-base align-middle" style={{ margin: '0 2px', padding: '1px 4px' }}>{children}</span>
      ),
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-2 text-deep-espresso">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2 text-deep-espresso">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-2 text-deep-espresso">{children}</h3>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-medium-coffee pl-4 italic text-medium-coffee mb-2">{children}</blockquote>,
    br: () => <br />,
  };

  const codeFixMarkdownComponents: { [key: string]: React.ElementType } = {
    p: ({ children }) => <p className="mb-3 whitespace-pre-line text-base leading-relaxed text-dark-charcoal">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-deep-espresso">{children}</strong>,
    ul: ({ children }) => <ul className="ml-6 space-y-2">{children}</ul>,
    li: ({ children }) => <li className="text-dark-charcoal leading-relaxed">{children}</li>,
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
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-2 text-deep-espresso">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2 text-deep-espresso">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-2 text-deep-espresso">{children}</h3>,
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
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
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

  // Inject CSS keyframes for shimmer animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Add state to track if the terminal has been initialized
  const [terminalInitialized, setTerminalInitialized] = useState(false);

  // Memoize the Terminal component so it is not remounted on tab switch
  const memoizedTerminal = useMemo(() => <Terminal />, []);

  return (
    <ProtectedRoute>
      <div className={`flex flex-col h-screen bg-light-cream text-dark-charcoal transition-colors duration-300 ${isInSetupPhase ? 'dim-layout' : ''}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-cream-beige bg-light-cream shadow-lg ide-dimmable">
    
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
        <div className={`flex flex-1 overflow-hidden relative`}>
          <ResizablePanelGroup direction="horizontal" className="flex-1 gap-0">
            {/* File Explorer */}
            <ResizablePanel 
              defaultSize={isExplorerCollapsed ? 5 : 20} 
              minSize={isExplorerCollapsed ? 5 : 15}
              maxSize={isExplorerCollapsed ? 5 : 35}
              collapsible={true}
              onCollapse={() => setIsExplorerCollapsed(true)}
              onExpand={() => setIsExplorerCollapsed(false)}
              className="border-0 ide-dimmable"
            >
              <FileExplorer
                files={files}
                onFileSelect={handleFileSelect}
                selectedFileId={selectedFile?.id || null}
                isCollapsed={isExplorerCollapsed}
                onToggleCollapse={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
                onFileCreate={handleFileCreate}
                onFileDelete={handleDeleteRequest}
                onRefresh={fetchFiles}
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
              className="border-0 ide-dimmable"
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

                  <TabsContent value="editor" className="flex-1 m-0" isInSetupPhase={isInSetupPhase}>
                    {selectedFile ? (
                      <MonacoEditor
                        language={selectedFile.language || 'plaintext'}
                        value={selectedFile.content || ''}
                        onChange={handleCodeChange}
                        theme="vs-dark"
                        highlightedLines={highlightedLines}
                        readOnly={isEditorReadOnly}
                      />
                    ) : isInSetupPhase ? (
                        <div className="flex items-center justify-center h-full bg-cream-beige">
                          <div className="text-center">
                            <div>
                              <IconMessage className="h-16 w-16 text-medium-coffee mx-auto mb-4" />
                              <p className="text-deep-espresso text-lg">Chat to finalize your project steps</p>
                              <p className="text-deep-espresso/70 text-sm mt-2">Answer the AI on the right, then press "Submit and Continue"</p>
                            </div>
                          </div>
                        </div>
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

                  <TabsContent value="preview" className="flex-1 m-0" isInSetupPhase={isInSetupPhase}>
                    {selectedFile?.language === 'html' ? (
                      <HTMLPreview 
                        htmlContent={selectedFile.content || ''} 
                        cssContent={getAllFiles(files).find(f => f.language === 'css')?.content}
                        jsContent={getAllFiles(files).find(f => f.language === 'javascript')?.content}
                        onConsoleLog={(message) => setOutput(prev => [...prev, message])}
                      />
                    ) : isReactProject ? (
                      <ReactPreview port={3000} />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-cream-beige/20">
                        <div className="text-center">
                          <IconPlayerPlay className="h-16 w-16 text-medium-coffee mx-auto mb-4" />
                          <p className="text-deep-espresso text-lg">Preview available for HTML files and React projects</p>
                          <p className="text-deep-espresso/70 text-sm mt-2">Create an HTML file or start a React project to see the preview</p>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Always render the Terminal, but only show it when terminal tab is active */}
                  <div
                    style={{
                      height: '400px', // Increased height
                      width: '100%',
                      background: 'black', // Black background for padding
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
                          ) : msg.type === 'assistant' && msg.content.startsWith('Here are the changes:') ? (
                            <div className="text-base">
                              <ReactMarkdown
                                children={msg.content}
                                remarkPlugins={[remarkGfm]}
                                components={regularMarkdownComponents}
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
                      {isInSetupPhase ? (
                        <Button
                          onClick={handleSubmitAndGenerateSteps}
                          variant="outline"
                          size="sm"
                          className="bg-white hover:bg-light-cream border-2 border-medium-coffee/30 text-medium-coffee hover:text-deep-espresso px-3 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md text-base"
                        >
                          Submit and Continue
                        </Button>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      
        {false && isInSetupPhase && (
          <div className="pointer-events-none absolute inset-0 z-[40] flex flex-col">
            {/* Top header overlay */}
            <div className="w-full h-16 bg-black/40" />
            {/* Bottom content overlay */}
            <div className="flex flex-1">
              {/* Left panel overlay (file explorer) */}
              <div className="flex-1 h-full bg-black/40" />
              {/* Center panel overlay (editor/preview/terminal) */}
              <div className="flex-1 h-full bg-black/40" />
              {/* Right panel (chat) - no overlay */}
              <div className="flex-2 h-full" />
            </div>
          </div>
        )}

        {/* Steps generation loading popup */}
        {isGeneratingSteps && (
          <ProjectSetupLoader 
            isOpen={isGeneratingSteps}
            title="Generating Your Project Steps"
            description="Creating personalized learning steps for your project..."
            progress={99}
            showProgress={true}
            spinnerSize="medium"
            countUpProgress={true}
            countUpSpeed={40}
            dynamicMessages={[
              "Analyzing your project description...",
              "Creating step-by-step learning path...",
              "Customizing steps for your skill level...",
              "Adding helpful hints and guidance...",
              "Finalizing your project roadmap..."
            ]}
            messageInterval={3000}
          />
        )}

        {/* Project setup loading popup - when transitioning from steps to actual project */}
        <ProjectSetupLoader 
          isOpen={isStartingFromSteps}
          title="Setting Up Your Project"
          description="Creating guided steps and preparing your workspace..."
          progress={90}
          showProgress={true}
          autoProgress={true}
          progressSpeed="normal"
          spinnerSize="large"
          countUpProgress={true}
          countUpSpeed={30}
          dynamicMessages={[
            "Creating guided steps and preparing your workspace...",
            "Setting up project files and structure...",
            "Configuring your development environment...",
            "Preparing your personalized learning path...",
            "Almost ready to start coding..."
          ]}
          messageInterval={2500}
        />

        {/* Project Description Modal */}
        <ProjectDescriptionModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSubmit={(desc) => {
            window.console.log('[GUIDE-LOG] ProjectDescriptionModal submitted with:', desc);
            handleStartProjectSetup(desc);
          }}
          isStartingProject={isStartingProject}
          error={projectStartError}
        ></ProjectDescriptionModal>

        <StepsPreviewModal
          isOpen={showStepsPreviewModal}
          steps={previewSteps}
          onClose={() => setShowStepsPreviewModal(false)}
          onStepsChange={(s) => setPreviewSteps(s)}
          onConfirm={handleConfirmStartProjectFromSteps}
          isStarting={isStartingFromSteps}
          error={stepsFlowError}
        />

        {/* Confirmation Modal */}
        {pendingDeleteFolderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-beige/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-cream-beige/50 p-6 max-w-sm w-full text-center">
              <h2 className="text-xl font-bold mb-3 text-deep-espresso">Delete Folder?</h2>
              <p className="mb-6 text-dark-charcoal">Are you sure you want to delete the folder <span className="font-semibold text-deep-espresso">{pendingDeleteFolderName}</span> and all its contents?</p>
              <div className="flex justify-center gap-4">
                <button
                  className="px-6 py-3 rounded-xl bg-light-cream hover:bg-cream-beige text-dark-charcoal font-semibold border-2 border-medium-coffee/30 transition-all duration-200 hover:scale-105 shadow-md"
                  onClick={() => { setPendingDeleteFolderId(null); setPendingDeleteFolderName(null); }}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                  onClick={() => handleFileDelete(pendingDeleteFolderId)}
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