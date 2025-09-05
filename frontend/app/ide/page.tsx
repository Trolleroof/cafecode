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
  IconVideo,
  IconRefresh
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel } from '@/components/ui/resizable';
import FileExplorer, { getLanguageFromFileName } from '@/components/FileExplorer';
import HTMLPreview from '@/components/HTMLPreview';
import RunDropdown from '@/components/RunDropdown';
import TypingIndicator from '@/components/TypingIndicator';
import ProjectDescriptionModal from '@/components/ProjectDescriptionModal';
import { ProtectedRoute } from '@/app/security/components/ProtectedRoute';
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
import { useAuth } from '../security/hooks/useAuth';
import axios from 'axios';
import ReactPreview from '@/components/ReactPreview';
import ProjectCompletionModal from '@/components/ProjectCompletionModal';
import PaymentModal from '@/components/PaymentModal';
import { supabase } from '../../lib/supabase';
import { FileNode } from '@/types';

const MonacoEditor = dynamic(() => import('@/components/MonacoEditor'), { ssr: false });
const Terminal = dynamic(() => import('@/components/Terminal'), { ssr: false });

// const backendUrl = 'http://localhost:8000/api';
// const WebSocketUrl = 'ws://localhost:8000'


//public backend url
const backendUrl = 'https://cafecode-backend-v2.fly.dev/api'
const WS_BASE_URL = 'wss://cafecode-backend-v2.fly.dev';


// CSS keyframes for shimmer animation
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;



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

// Language detection now imported from FileExplorer

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

// Helper function to update file content in tree (for lazy loading)
const updateFileContentInTree = (nodes: FileNode[], fileId: string, content: string): FileNode[] => {
  return nodes.map(node => {
    if (node.id === fileId) {
      return { ...node, content, language: getLanguageFromFileName(node.name) };
    } else if (node.children) {
      return { ...node, children: updateFileContentInTree(node.children, fileId, content) };
    }
    return node;
  });
};

// Helper function to add a file to the tree
const addFileToTree = (nodes: FileNode[], parentPath: string, newNode: FileNode): FileNode[] => {
  return nodes.map(node => {
    if (node.id === parentPath && node.type === 'folder') {
      return { ...node, children: [...(node.children || []), newNode] };
    } else if (node.children) {
      return { ...node, children: addFileToTree(node.children, parentPath, newNode) };
    }
    return node;
  });
};

// Helper function to remove a file from the tree
const removeFileFromTree = (nodes: FileNode[], fileId: string): FileNode[] => {
  return nodes.filter(node => node.id !== fileId).map(node => {
    if (node.children) {
      return { ...node, children: removeFileFromTree(node.children, fileId) };
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
        // Create a unique ID that includes the full path context
        const uniqueId = isLastPart ? file.name : `${file.name}:${currentPath}`;
        existingNode = {
          id: uniqueId,
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
        existingNode.type = 'file';
        existingNode.children = undefined;
        existingNode.language = getLanguageFromFileName(part);
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
  const [highlightedFileId, setHighlightedFileId] = useState<string | null>(null);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  // Folder deletion confirmation state
  const [pendingDeleteFolderId, setPendingDeleteFolderId] = useState<string | null>(null);
  const [pendingDeleteFolderName, setPendingDeleteFolderName] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Chat scroll reference
  const chatEndRef = useRef<HTMLDivElement>(null);
  
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
  
  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, isTyping]);
  
  // Removed isChatOpen and showChatClosedMessage, chat is always open

  // Guided project state
  const [guidedProject, setGuidedProject] = useState<GuidedProject | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [stepComplete, setStepComplete] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set()); // Track completed step IDs
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

  // Follow-up flow state
  const [isInFollowUpPhase, setIsInFollowUpPhase] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<any[]>([]);
  const [followUpSummary, setFollowUpSummary] = useState('');
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false);
  const [showSubmitButton, setShowSubmitButton] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('editor');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showVideoWarning, setShowVideoWarning] = useState(false);
  const router = useRouter();
  const { session } = useAuth();

  // Image preview blob URL (to pass auth while fetching)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Simple file loading state
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Create a file ID cache for efficient lookups
  const fileIdCache = useMemo(() => {
    const cache = new Map<string, FileNode>();
    const buildCache = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        cache.set(node.id, node);
        if (node.children) {
          buildCache(node.children);
        }
      });
    };
    buildCache(files);
    return cache;
  }, [files]);

  // Helper function to find a node by its ID using cache for efficiency
  const findNodeById = (id: string, nodes?: FileNode[]): FileNode | null => {
    // Use cache for quick lookup
    const cached = fileIdCache.get(id);
    if (cached) {
      return cached;
    }
    
    // Fallback to tree traversal if cache miss (shouldn't happen often)
    if (nodes) {
      for (const node of nodes) {
        if (node.id === id) {
          return node;
        }
        if (node.children) {
          const found = findNodeById(id, node.children);
          if (found) return found;
        }
      }
    }
    
    // Only log missing nodes for debugging, but skip common test files
    if (process.env.NODE_ENV === 'development' && id !== 'test.py' && !id.includes('test')) {
      console.log(`🔍 [FIND-NODE] Node not found: ${id}`);
    }
    return null;
  };

  // Helper function to recursively remove a node by its ID
  const removeNodeById = (id: string, nodes: FileNode[]): FileNode[] => {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children) {
        node.children = removeNodeById(id, node.children);
      }
      return true;
    });
  };
  
  // Helper function to get parent ID from a file's full path ID
  const getParentIdFromFileId = (id: string): string | null => {
    const parts = id.split('/');
    if (parts.length <= 1) return null; // Root file
    return parts.slice(0, -1).join('/');
  };

  // Normalize a node id to its real path (folder ids may include a prefix before ':')
  const normalizeIdToPath = (id: string): string => {
    if (!id) return id;
    // Some folder nodes have ids like "full/file/path:folder/path". Use the part after the last ':' as the real path.
    const lastColon = id.lastIndexOf(':');
    return lastColon >= 0 ? id.substring(lastColon + 1) : id;
  };

  // Helper function to build file path from parent ID and name
  const buildPathFromId = (parentId: string | null, name: string): string => {
    const parentPath = parentId ? normalizeIdToPath(parentId) : null;
    if (!parentPath || parentPath === '.' || parentPath === '/') return name;
    return parentPath + '/' + name;
  };

  // File selection handler
  const handleFileSelect = async (file: FileNode) => {
    // If it's a folder, just select it
    if (file.type === 'folder') {
      setSelectedFile(file);
      return;
    }
    
    // For files, load content lazily if not already loaded
    if (!file.content) {
      try {
        const res = await axios.get(`${backendUrl}/v2/file/${encodeURIComponent(file.id)}`, {
          headers: getAuthHeaders()
        });
        
        const fileWithContent = {
          ...file,
          content: res.data.content,
          language: getLanguageFromFileName(file.name)
        };
        
        // Update the file in the tree with content
        setFiles(prevFiles => updateFileContentInTree(prevFiles, file.id, res.data.content));
        setSelectedFile(fileWithContent);
      } catch (err: any) {
        console.error('Failed to load file content:', err);
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: `Failed to load file: ${err.response?.data?.error || err.message}`,
          timestamp: new Date()
        }]);
      }
    } else {
      setSelectedFile(file);
    }
    
    setActiveTab('editor');
  };

  // File deletion request handler (with confirmation for folders)
  const handleDeleteRequest = (fileId: string) => {
    const nodeToDelete = findNodeById(fileId, files);
    if (nodeToDelete && nodeToDelete.type === 'folder') {
      setPendingDeleteFolderId(fileId);
      setPendingDeleteFolderName(nodeToDelete.name);
      return;
    }
    // If not a folder, delete immediately
    handleFileDelete(fileId);
  };

  // Simple file loading function using v2 API
  const loadFiles = useCallback(async () => {
    if (!session?.access_token) {
      setFilesError('Authentication required');
      return;
    }
      
    setFilesError(null);
    setIsLoadingFiles(true);
    
    try {
      // Use new v2 API - single endpoint for file tree
      const res = await axios.get(`${backendUrl}/v2/files?recursive=1&withContent=0`, {
        headers: getAuthHeaders()
      });
      
      // Transform v2 format to tree structure
      const fileList = res.data.map((item: any) => ({
        name: item.path,
        isDirectory: item.isDir
      }));
      
      const nodes = convertBackendFilesToTree(fileList);
      setFiles(nodes);
    } catch (err: any) {
      console.error('Failed to fetch files:', err);
      setFilesError(err.response?.data?.error || err.message || 'Failed to load files');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [session]);

  // Store ETag for file list
  const fileListETagRef = useRef<string | null>(null);
  const refreshDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileEventsWsRef = useRef<WebSocket | null>(null);
  const selectedFileRef = useRef<FileNode | null>(null);
  const refreshFileTreeRef = useRef<((force?: boolean) => void) | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const connectingRef = useRef<boolean>(false);
  
  // Unified refresh function with debouncing and ETag support (optimized)
  const refreshFileTree = useCallback(async (force = false) => {
    // Clear existing debounce timer if force refresh
    if (force && refreshDebounceTimerRef.current) {
      clearTimeout(refreshDebounceTimerRef.current);
      refreshDebounceTimerRef.current = null;
    }
    
    // If not forced, debounce the refresh
    if (!force) {
      if (refreshDebounceTimerRef.current) {
        console.log('🔄 [REFRESH] Debounced - skipping duplicate refresh request');
        return;
      }
      
      refreshDebounceTimerRef.current = setTimeout(() => {
        refreshDebounceTimerRef.current = null;
        refreshFileTree(true); // Execute the actual refresh
      }, 30000); // 30 second debounce (reduced from 5s to prevent spam)
      
      console.log('🔄 [REFRESH] Scheduled debounced refresh in 30 seconds');
      return;
    }
    
    console.log('🔄 [REFRESH] Starting file tree refresh...');
    setFilesError(null);
    setIsLoadingFiles(true);
    
    try {
      const headers = {
        ...getAuthHeaders(),
        ...(fileListETagRef.current ? { 'If-None-Match': fileListETagRef.current } : {})
      };
      
      const res = await axios.get(`${backendUrl}/v2/files?recursive=1&withContent=0`, { 
        headers,
        validateStatus: (status) => status < 500 // Accept 304 as valid response
      });
      
      // Check if data hasn't changed (304 Not Modified)
      if (res.status === 304) {
        console.log('✅ [REFRESH] File tree unchanged (304 Not Modified)');
        setIsLoadingFiles(false);
        return;
      }
      
      // Store new ETag if provided
      const newETag = res.headers['etag'];
      if (newETag) {
        fileListETagRef.current = newETag;
        console.log('📋 [REFRESH] Stored new ETag:', newETag);
      }
      
      // Transform v2 format to tree structure
      const fileList = res.data.map((item: any) => ({
        name: item.path,
        isDirectory: item.isDir
      }));
      
      const nodes = convertBackendFilesToTree(fileList);
      console.log(`✅ [REFRESH] Refresh completed: ${nodes.length} files loaded`);
      
      // Update the files state
      setFiles(nodes);
      
      // If a file was selected, make sure it still exists
      if (selectedFile) {
        const stillExists = findNodeById(selectedFile.id, nodes);
        if (!stillExists) {
          console.log(`⚠️ [REFRESH] Selected file no longer exists: ${selectedFile.id}`);
          setSelectedFile(null);
        }
      }
    } catch (err: any) {
      if (err.response?.status !== 304) {
        console.error('Failed to refresh files:', err);
        setFilesError(err.response?.data?.error || err.message || 'Failed to refresh files');
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, [session, selectedFile]);

  // Keep refs in sync with latest values to avoid effect dependency churn
  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    refreshFileTreeRef.current = refreshFileTree;
  }, [refreshFileTree]);
  
  // Alias for backward compatibility
  const handleRefresh = refreshFileTree;

  // Smart refresh is now just an alias for force refresh
  const handleSmartRefresh = useCallback(() => refreshFileTree(true), [refreshFileTree]);

  // Detect inconsistencies between frontend and backend file states
  const detectInconsistencies = (frontendFiles: FileNode[], backendFiles: FileNode[]): string[] => {
    const inconsistencies: string[] = [];
    
    // Simple check: if file counts don't match, there's likely an inconsistency
    if (frontendFiles.length !== backendFiles.length) {
      inconsistencies.push(`File count mismatch: frontend=${frontendFiles.length}, backend=${backendFiles.length}`);
    }
    
    // More sophisticated checks could be added here
    // For now, this simple check is sufficient
    
    return inconsistencies;
  };

  // Helper to get auth headers with proper Supabase token
  const getAuthHeaders = () => {
    const token = session?.access_token;
    if (!token) {
      console.error('Auth check failed:', { 
        hasSession: !!session, 
        hasAccessToken: !!session?.access_token,
        sessionKeys: session ? Object.keys(session) : null 
      });
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Step completion tracking helpers
  const isStepCompleted = (stepId: string) => {
    return completedSteps.has(stepId);
  };

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set(Array.from(prev).concat(stepId)));
  };

  const markStepIncomplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.delete(stepId);
      return newSet;
    });
  };

  const getCurrentStepId = () => {
    if (!guidedProject) return null;
    return guidedProject.steps[guidedProject.currentStep]?.id;
  };

  const getProjectCompletionStatus = () => {
    if (!guidedProject) return { completed: 0, total: 0, percentage: 0 };
    
    const total = guidedProject.steps.length;
    const completed = guidedProject.steps.filter(step => isStepCompleted(step.id)).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const canMoveToStep = (targetStepIndex: number) => {
    if (!guidedProject || targetStepIndex < 0 || targetStepIndex >= guidedProject.steps.length) {
      return false;
    }
    
    // Can always move to previous steps
    if (targetStepIndex < guidedProject.currentStep) {
      return true;
    }
    
    // Can only move to next step if current step is completed
    if (targetStepIndex === guidedProject.currentStep + 1) {
      return isStepCompleted(getCurrentStepId() || '');
    }
    
    // For steps beyond next, check if all previous steps are completed
    if (targetStepIndex > guidedProject.currentStep + 1) {
      // Check if all steps from current to target-1 are completed
      for (let i = guidedProject.currentStep; i < targetStepIndex; i++) {
        const stepId = guidedProject.steps[i]?.id;
        if (stepId && !isStepCompleted(stepId)) {
          return false;
        }
      }
      return true;
    }
    
    // Cannot skip steps
    return false;
  };

  // Optimistic file creation with immediate UI update
  const handleFileCreate = async (parentId: string | null, type: 'file' | 'folder', name: string): Promise<void> => {
    const newPath = buildPathFromId(parentId, name);
    
    const optimisticNode: FileNode = {
      id: newPath,
      name,
      type,
      children: type === 'folder' ? [] : undefined,
      language: type === 'file' ? getLanguageFromFileName(name) : undefined,
    };

    const originalFiles = files;

    // Log immediately so it appears before any backend logs
    console.log(`📁 [FILE-EVENTS] Adding new file to tree: ${newPath}`);

    setFiles(prev => {
      const existingFile = findNodeById(newPath, prev);
      if (existingFile) {
        console.log(`📁 [OPTIMISTIC] File already exists, skipping optimistic update: ${newPath}`);
        return prev;
      }

      console.log(`📁 [OPTIMISTIC] Parent ID: ${parentId}`);
      const parentPath = parentId ? normalizeIdToPath(parentId) : null;

      if (parentPath === null) {
        // Add to root
        return [...prev, optimisticNode];
      }
      // Add inside specified folder using tree helper (avoids cache lookups)
      return addFileToTree(prev, parentPath, optimisticNode);
    });

    // Optimistically select the new file if it's a file (not folder)
    if (type === 'file') {
      setSelectedFile(optimisticNode);
      setActiveTab('editor');
    }
    // Briefly highlight the created node (file or folder)
    setHighlightedFileId(newPath);
    setTimeout(() => setHighlightedFileId(null), 2000);

    try {
      await axios.post(`${backendUrl}/v2/file/${encodeURIComponent(newPath)}`, 
        { isFolder: type === 'folder' },
        { headers: getAuthHeaders() }
      );
      
      console.log(`✅ [CREATE] File created successfully: ${newPath}`);
      // Success - optimistic update is now the source of truth
      
    } catch (err: any) {
      console.error('❌ [CREATE] Failed to create file:', err);
      // On error, revert the optimistic update
      setFiles(originalFiles);
      setFilesError(`Failed to create ${type}: ${err.response?.data?.error || err.message}`);
      
      // Re-throw the error so the FileExplorer can handle it
      throw new Error(err.response?.data?.error || err.message || 'Failed to create file');
    }
  };

  // Optimistic file deletion with immediate UI update
  const handleFileDelete = async (fileId: string) => {
    const originalFiles = files;
    
    // Set loading state
    setIsDeleting(true);
    
    // Optimistically remove from UI
    setFiles(prev => {
      const newFiles = JSON.parse(JSON.stringify(prev)); // Deep copy
      return removeNodeById(fileId, newFiles);
    });

    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }

    // Close the modal immediately after optimistic update for better UX
    setIsDeleting(false);
    setPendingDeleteFolderId(null);
    setPendingDeleteFolderName(null);

    try {
      const deletePath = normalizeIdToPath(fileId);
      await axios.delete(`${backendUrl}/v2/file/${encodeURIComponent(deletePath)}`, { 
        headers: getAuthHeaders()
      });
      
      console.log(`✅ [DELETE] File deleted successfully: ${fileId}`);
      // Success - optimistic update is now the source of truth
      
    } catch (err: any) {
      console.error('❌ [DELETE] Failed to delete file:', err);
      // On error, revert the optimistic update
      setFiles(originalFiles);
      setFilesError(`Failed to delete: ${err.response?.data?.error || err.message}`);
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

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (refreshDebounceTimerRef.current) {
        clearTimeout(refreshDebounceTimerRef.current);
      }
      if (fileEventsWsRef.current) {
        fileEventsWsRef.current.close();
      }
    };
  }, []);
  
  // Set up WebSocket connection for file events (stabilized)
  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) return;
       
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    
    const connectWebSocket = () => {
      // Prevent parallel connects
      if (connectingRef.current) {
        return;
      }
      // If an existing connection is open or connecting, skip
      if (fileEventsWsRef.current && (fileEventsWsRef.current.readyState === WebSocket.OPEN || fileEventsWsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }
      connectingRef.current = true;
      try {
        const wsUrl = WS_BASE_URL
        console.log('📡 [FILE-EVENTS] Attempting to connect to:', `${wsUrl}/file-events`);
        
        const encodedToken = encodeURIComponent(session.access_token);
        const fullWsUrl = `${wsUrl}/file-events?access_token=${encodedToken}`;
        console.log('📡 [FILE-EVENTS] Full WebSocket URL (token truncated):', fullWsUrl.replace(/access_token=[^&]*/, 'access_token=***REDACTED***'));
        
        ws = new WebSocket(fullWsUrl);
        
        ws.onopen = () => {
          console.log('📡 [FILE-EVENTS] WebSocket connected successfully');
          fileEventsWsRef.current = ws;
          reconnectAttemptsRef.current = 0; // reset backoff
          connectingRef.current = false;
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 [FILE-EVENTS] Received event:', data);
            
            if (data.type === 'connected') {
              return; // Connection confirmation
            }
            
            // Handle file events with optimistic updates
            switch (data.type) {
              case 'file:created':
                console.log(`📁 [FILE-EVENTS] File created: ${data.path}`);
                // Check if file already exists (to prevent duplicates from optimistic updates)
                setFiles(prevFiles => {
                  const existingFile = findNodeById(data.path, prevFiles);
                  if (existingFile) {
                    console.log(`📁 [FILE-EVENTS] File already exists, skipping: ${data.path}`);
                    return prevFiles; // File already exists, don't add again
                  }

                  console.log(`📁 [FILE-EVENTS] Adding new file to tree: ${data.path}`);
                  
                  // File doesn't exist, add it to the tree
                  const parts = data.path.split('/');
                  const fileName = parts.pop() || '';
                  const parentPath = parts.length > 0 ? parts.join('/') : null;
                  
                  const newNode: FileNode = {
                    id: data.path,
                    name: fileName,
                    type: data.isFolder ? 'folder' : 'file',
                    children: data.isFolder ? [] : undefined,
                    language: data.isFolder ? undefined : getLanguageFromFileName(fileName)
                  };
                  
                  if (!parentPath) {
                    return [...prevFiles, newNode];
                  } else {
                    return addFileToTree(prevFiles, parentPath, newNode);
                  }
                });
                break;
                
              case 'file:updated':
                console.log(`📝 [FILE-EVENTS] File updated: ${data.path}`);
                // If this is the currently selected file, we might want to reload its content
                if (selectedFileRef.current && selectedFileRef.current.id === data.path) {
                  console.log('📝 [FILE-EVENTS] Current file was updated externally');
                  // Could show a notification or reload the file
                }
                break;
                
              case 'file:deleted':
                console.log(`🗑️ [FILE-EVENTS] File deleted: ${data.path}`);
                // Remove the file from the tree
                setFiles(prevFiles => removeFileFromTree(prevFiles, data.path));
                // Clear selection if deleted file was selected
                if (selectedFile && selectedFile.id === data.path) {
                  setSelectedFile(null);
                }
                break;
                
              default:
                console.log(`❓ [FILE-EVENTS] Unknown event type: ${data.type}`);
            }
            
            // Don't schedule automatic refresh on every WebSocket event
            // The optimistic updates above already keep the file tree in sync
            // Only refresh if there's a real inconsistency detected
            console.log('📡 [FILE-EVENTS] File tree updated optimistically - no refresh needed');
          } catch (err) {
            console.error('📡 [FILE-EVENTS] Error handling message:', err);
          }
        };
        
        ws.onerror = (error) => {
          console.warn('📡 [FILE-EVENTS] WebSocket error (this is normal if backend is not running):', error);
        };
        
        ws.onclose = (event) => {
          console.log('📡 [FILE-EVENTS] WebSocket disconnected - Code:', event.code, 'Reason:', event.reason || 'No reason provided');
          console.log('📡 [FILE-EVENTS] Close event details:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            type: event.type
          });
          
          // Decode common close codes
          const closeCodeMeaning: Record<string, string> = {
            1000: 'Normal closure',
            1001: 'Going away', 
            1002: 'Protocol error',
            1003: 'Unsupported data',
            1006: 'Abnormal closure (no close frame)',
            1011: 'Server error',
            4001: 'Missing access token',
            4002: 'Invalid access token'
          };
          const meaning = closeCodeMeaning[String(event.code)] || 'Unknown code';
          console.log('📡 [FILE-EVENTS] Close code meaning:', meaning);
          fileEventsWsRef.current = null;
          connectingRef.current = false;
          
          // Only attempt to reconnect if it wasn't a manual close and session is still valid
          if (event.code !== 1000 && accessToken) {
            // Exponential backoff with cap at 30s
            const attempt = Math.min(reconnectAttemptsRef.current + 1, 5);
            reconnectAttemptsRef.current = attempt;
            const delay = Math.min(30000, 2000 * Math.pow(2, attempt - 1));
            console.log(`📡 [FILE-EVENTS] Attempting to reconnect in ${Math.round(delay/1000)}s... (attempt ${attempt})`);
            reconnectTimeout = setTimeout(() => {
              if (accessToken) {
                connectWebSocket();
              }
            }, delay);
          }
        };
        
      } catch (error) {
        console.warn('📡 [FILE-EVENTS] Failed to establish WebSocket connection (backend may not be running):', error);
        connectingRef.current = false;
      }
    };
    
    // Initial connection attempt
    connectWebSocket();
    
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [session?.access_token]);
  
  const handleCodeChange = (value: string | undefined) => {
    if (selectedFile && value !== undefined) {
      const updatedFile = { ...selectedFile, content: value };
      setSelectedFile(updatedFile);
      setFiles(updateFileInTree(files, selectedFile.id, value));
      // Clear highlights when code is modified
      setHighlightedLines([]);
      
      // Auto-save with debouncing (1 second delay)
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await axios.put(`${backendUrl}/v2/file/${encodeURIComponent(selectedFile.id)}`, 
            { content: value },
            { headers: getAuthHeaders() }
          );
          console.log(`✅ [AUTO-SAVE] File saved: ${selectedFile.name}`);
        } catch (err: any) {
          console.error('Failed to auto-save file:', err);
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: `Failed to save file: ${err.response?.data?.error || err.message}`,
            timestamp: new Date()
          }]);
        }
      }, 1000);
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

    if (isInSetupPhase) {
      if (isInFollowUpPhase) {
        // Pass the current user message to handleFollowUpResponse
        handleFollowUpResponse(userMessage.content);
        return;
      }
      
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
          
          // Handle nextQuestion with delay if present
          if (result.nextQuestion?.content) {
            setTimeout(() => {
              if (!ignoreIncomingSetupResponses) {
                setChatMessages(prev => [...prev, { 
                  type: 'assistant', 
                  content: result.nextQuestion.content, 
                  timestamp: new Date() 
                }]);
              }
            }, result.nextQuestion.delay || 800);
          }
          
          setIsTyping(false);
        } else {
          setIsTyping(false);
        }
      } catch (error) {
        if (!ignoreIncomingSetupResponses) {
          // Add a small delay to show the typing indicator for fallback message
          setTimeout(() => {
            setChatMessages(prev => [...prev, { type: 'assistant', content: 'I\'ve noted your preferences. What else should we refine before generating steps?', timestamp: new Date() }]);
            setIsTyping(false);
          }, 600);
        } else {
          setIsTyping(false);
        }
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // Normal chat requires an active guided project
    if (!guidedProject) {
      setIsTyping(true);
      // Add a small delay to show the typing indicator
      setTimeout(() => {
        setChatMessages(prev => [...prev, { type: 'assistant', content: 'Please start a guided project before chatting with the assistant. Click "Start Guided Project" at the top to begin!', timestamp: new Date() }]);
        setIsTyping(false);
      }, 800);
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
          history: [{ type: 'user', content: userMessage.content }]
        })
      });
      result = await response.json();
      if (result.response) {
        setChatMessages(prev => [...prev, { type: 'assistant', content: result.response.content, timestamp: new Date() }]);
        
        setIsTyping(false);
      } else {
        setIsTyping(false);
      }
    } catch (error) {
      console.error('Error in simple chat:', error);
      
      // Provide a helpful error message instead of making another API call
      const errorMessage: ChatMessage = { 
        type: 'assistant', 
        content: "I'm having trouble processing your request right now. Please try refreshing the page or ask your question again in a moment.",
        timestamp: new Date() 
      };
      // Add a small delay to show the typing indicator for error messages
      setTimeout(() => {
        setChatMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
      }, 600);
      return; // Return early since we're handling the typing state in the setTimeout
    } finally {
      setIsTyping(false);
    }
  };

  // Chat action buttons functionality
  const handleGetHint = async () => {
    if (!selectedFile || !selectedFile.content) {
      setIsTyping(true);
      // Add a small delay to show the typing indicator
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: 'Please select a file with some code first, and I\'ll give you a helpful hint!',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    setIsTyping(true);
    // Add a small delay to show the typing indicator before the "Getting hint..." message
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: '💡 Getting hint...',
        timestamp: new Date()
      }]);
    }, 400);
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
      
      // Provide a helpful hint message instead of making another API call
      const fallbackHint: ChatMessage = { 
        type: 'assistant', 
        content: "💡 **Hint**: Try breaking down your problem into smaller steps. Look for any syntax errors first, then check your logic flow!", 
        timestamp: new Date() 
      };
      // Add a small delay to show the typing indicator for fallback hint
      setTimeout(() => {
        setChatMessages(prev => [...prev, fallbackHint]);
        setIsTyping(false);
      }, 600);
      return; // Return early since we're handling the typing state in the setTimeout
    } finally {
      setIsTyping(false);
    }
  };

  // Add state for editor read-only
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(false);

  const handleFixCode = async () => {
    if (!selectedFile || !selectedFile.content || selectedFile.content.trim().length < 10) {
      setIsTyping(true);
      // Add a small delay to show the typing indicator
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: 'You need to attempt something substantial for me to fix.',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    // Only allow Fix Code if a guided project is active and the current step is not complete
    if (!guidedProject || stepComplete) {
      setIsTyping(true);
      // Add a small delay to show the typing indicator
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: 'Code fixing is only available for the current step of an active guided project.',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 600);
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
      setIsTyping(true);
      // Add a small delay to show the typing indicator
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: 'Code fixing is only supported for Python, JavaScript, Java, C++, C, HTML, CSS, and TypeScript files.',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }
    if (!errorMessage || errorMessage.trim().length === 0) {
      errorMessage = 'Code is not working as expected.';
    }

    setIsTyping(true);
    // Add a small delay to show the typing indicator before the "Fixing code..." message
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: '🛠️ Fixing code...',
        timestamp: new Date()
      }]);
    }, 400);
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
      
      // Provide a helpful code review message instead of making another API call
      const fallbackReview: ChatMessage = { 
        type: 'assistant', 
        content: '🔧 **Code Review**: Your code looks good! Here are some general tips:\n\n• Check for proper indentation\n• Use meaningful variable names\n• Add comments for complex logic\n• Test your code with different inputs', 
        timestamp: new Date() 
      };
      setChatMessages(prev => [...prev, fallbackReview]);
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
      
      // Provide a helpful code explanation message instead of making another API call
      const fallbackExplanation: ChatMessage = { 
        type: 'assistant', 
        content: `📚 **Code Explanation**:\n\nThis ${selectedFile.language} code appears to be well-structured. Here's what it does:\n\n• Defines functions and variables\n• Implements logic for your application\n• Uses proper ${selectedFile.language} syntax\n\nWould you like me to explain any specific part in more detail?`, 
        timestamp: new Date() 
      };
      setChatMessages(prev => [...prev, fallbackExplanation]);
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
        setIsTyping(true);
        // Add a small delay to show the typing indicator
        setTimeout(() => {
          setChatMessages(prev => [...prev, { type: 'assistant', content: 'Let\'s clarify your idea with a few questions:\n1) What are the core features you want?\n2) Which technologies do you prefer?\n3) Any constraints or deadlines?\n4) Who is this for, and what\'s the simplest MVP?', timestamp: new Date() }]);
          setIsTyping(false);
        }, 800);
        // Set isInSetupPhase even on error to maintain consistency
        setIsInSetupPhase(true);
      }
    } catch (error) {
      console.error('Error starting setup flow:', error);
      setProjectStartError('Failed to start setup. Please try again.');
      // Set isInSetupPhase on error to maintain consistency
      setIsInSetupPhase(true);
      
      // Add typing indicator for error message
      setIsTyping(true);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          type: 'assistant', 
          content: 'Failed to start setup. Please try again.', 
          timestamp: new Date() 
        }]);
        setIsTyping(false);
      }, 600);
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
    
    // Reset follow-up flow state
    setIsInFollowUpPhase(false);
    setFollowUpSuggestions([]);
    setFollowUpSummary('');
    setShowSubmitButton(false);
    
    try {
      // If we're in follow-up phase, we need to create an enhanced project description
      let enhancedDescription = setupDescription;
      if (isInFollowUpPhase) {
        // Extract user responses from the follow-up chat to enhance the project description
        const userResponses = chatMessages
          .filter(msg => msg.type === 'user' && msg.content !== '')
          .slice(-5) // Take last 5 user messages to avoid too much context
          .map(msg => msg.content)
          .join('. ');
        
        if (userResponses) {
          enhancedDescription = `${setupDescription}\n\nAdditional requirements from user: ${userResponses}`;
        }
      }
      
      const response = await fetch('/api/guided/steps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          projectDescription: enhancedDescription, 
          history: chatMessages, 
          projectFiles: files 
        })
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result.steps)) {
        // Store the original steps for comparison later
        setOriginalSteps(result.steps);
        setPreviewSteps(result.steps);
        setShowStepsPreviewModal(true);
        setIsInSetupPhase(false);
      } else {
        if (response.status === 500) {
          setStepsFlowError('Server error occurred. Please press "Generate Steps" again to retry.');
          // Also add to chat
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: '❌ **Server Error**: The step generation failed. Please press "Generate Steps" again to retry.',
            timestamp: new Date()
          }]);
        } else {
          setStepsFlowError(result?.error || 'An error happened. Please try again.');
        }
      }
    } catch (e) {
      setStepsFlowError('Server error occurred. Please press "Generate Steps" again to retry.');
      // Also add to chat
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: '❌ **Server Error**: The step generation failed. Please press "Generate Steps" again to retry.',
        timestamp: new Date()
      }]);
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  // Confirm and start the guided project from cleaned steps
  const handleConfirmStartProjectFromSteps = async () => {
    setStepsFlowError(null);
    setIsStartingFromSteps(true);
    try {
      // Enforce paywall only when creating a new project
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('project_count, payment_status, has_unlimited_access')
            .eq('id', user.id)
            .maybeSingle();
          const unlimited = profile?.payment_status === 'paid' || profile?.has_unlimited_access === true;
          const count = profile?.project_count || 0;
          setProjectCount(count);
          setHasUnlimitedAccess(unlimited);
          if (count >= 1 && !unlimited) {
            // Notify in terminal and show paywall modal
            setOutput(prev => [
              ...prev,
              '🚫 Free project limit reached.',
              'You have used your 1 free project.',
              'Upgrade to unlock unlimited guided projects.',
              'Opening payment options...'
            ]);
            // Small toast notification for quick feedback
            try {
              const { toast } = await import('sonner');
              toast.warning('Free project limit reached', {
                description: 'Upgrade to create unlimited guided projects.',
              });
            } catch {}
            setShowPaymentModal(true);
            setIsStartingFromSteps(false);
            return; // Do not start project
          }
        }
      } catch (e) {
        // If we fail to check, allow flow to continue rather than blocking
        console.warn('Paywall check failed, continuing:', e);
      }

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
      
      const projectResponse = await fetch('/api/guided/startProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectDescription: setupDescription, projectFiles: files, steps: finalSteps })
      });
      const projectResult = await projectResponse.json();
      if (projectResponse.status === 402 && projectResult?.needsPayment) {
        // Backend enforced paywall; show payment modal
        setOutput(prev => [
          ...prev,
          '🚫 Free project limit reached.',
          'You have used your 1 free project.',
          'Upgrade to unlock unlimited guided projects.',
          'Opening payment options...'
        ]);
        try {
          const { toast } = await import('sonner');
          toast.warning('Free project limit reached', {
            description: 'Upgrade to create unlimited guided projects.',
          });
        } catch {}
        setShowPaymentModal(true);
        setIsStartingFromSteps(false);
        return;
      }
      if (projectResponse.ok && projectResult.projectId && Array.isArray(projectResult.steps)) {
        // Reset step completion tracking for new project
        setCompletedSteps(new Set());
        setStepComplete(false);
        
        setGuidedProject({ projectId: projectResult.projectId, steps: projectResult.steps, currentStep: 0, projectContext: projectResult.projectContext });
        if (projectResult.welcomeMessage) {
          setIsTyping(true);
          // Add a small delay to show the typing indicator for welcome message
          setTimeout(() => {
            setChatMessages(prev => [...prev, { type: 'assistant', content: projectResult.welcomeMessage.content, timestamp: new Date() }]);
            setIsTyping(false);
          }, 800);
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


  const handleCheckStep = async () => {
    if (!guidedProject) {
      setIsTyping(true);
      // Add a small delay to show the typing indicator
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: 'Please start a guided project before checking steps.',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    setIsCheckingStep(true);
    
    try {
      // Call backend analyzeStep endpoint - backend will determine what to analyze
      const response = await fetch('/api/guided/analyzeStep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          projectId: guidedProject.projectId,
          stepId: guidedProject.steps[guidedProject.currentStep].id,
          code: selectedFile?.content || '', // Can be empty for creation steps
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

      // Handle the backend analysis result
      if (result.feedback && Array.isArray(result.feedback)) {
        const allCorrect = result.feedback.every((f: any) => f.correct);
        
        // Update step completion status based on backend analysis
        const currentStepId = getCurrentStepId();
        if (currentStepId) {
          if (allCorrect) {
            markStepCompleted(currentStepId);
            setStepComplete(true);
          } else {
            markStepIncomplete(currentStepId);
            setStepComplete(false);
          }
        }
        
        // Show chat message from backend
        if (result.chatMessage) {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: result.chatMessage.content,
            timestamp: new Date()
          }]);
        }
        
        // Log detailed analysis result to terminal
        setOutput(prev => [...prev, 
          `🔍 Backend Step Analysis:`,
          `   Step: ${guidedProject.currentStep + 1}`,
          `   Instruction: ${guidedProject.steps[guidedProject.currentStep].instruction}`,
          `   Analysis Type: ${result.analysisType || 'unknown'}`,
          `   Target: ${result.targetName || 'N/A'}`,
          `   Exists: ${result.exists || 'N/A'}`,
          `   Result: ${allCorrect ? '✅ PASSED' : '❌ NEEDS WORK'}`,
          `   Feedback: ${result.feedback.map((f: any) => `${f.correct ? '✅' : '❌'} Line ${f.line}: ${f.suggestion}`).join('; ')}`,
          ``
        ]);
      } else {
        // Handle case where backend didn't return feedback array
        setStepComplete(false);
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: result.chatMessage?.content || 'Unable to analyze this step. Please review the instruction and try again.',
          timestamp: new Date()
        }]);
        
        // Log the issue to terminal
        setOutput(prev => [...prev, 
          `⚠️ Step Analysis Issue:`,
          `   Step: ${guidedProject.currentStep + 1}`,
          `   Backend Response: ${JSON.stringify(result, null, 2)}`,
          ``
        ]);
      }
    } catch (error) {
      console.error('Error checking step:', error);
      setStepComplete(false);
      setChatMessages(prev => [...prev, {
        type: 'assistant',
        content: '❌ Unable to check step right now. Please try again in a moment.',
        timestamp: new Date()
      }]);
      
      // Log error to terminal
      setOutput(prev => [...prev, 
        `❌ Step Check Error:`,
        `   Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ``
      ]);
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
      
      // Check if the previous step is already completed
      const prevStepId = guidedProject.steps[prevStepIndex]?.id;
      if (prevStepId && isStepCompleted(prevStepId)) {
        setStepComplete(true);
      } else {
        setStepComplete(false);
      }

      const prevStep = guidedProject.steps[prevStepIndex];
      // Removed chat message about going back to step
    }
  };

  // Only allow moving forward if the current step is complete
  const handleNextStep = () => {
    if (!guidedProject) return;
    
    const nextStepIndex = guidedProject.currentStep + 1;
    
    // Check if we can move to the next step
    if (!canMoveToStep(nextStepIndex)) {
      const currentStepId = getCurrentStepId();
      if (currentStepId && !isStepCompleted(currentStepId)) {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: '🔒 **Step Locked!** Please complete the current step by clicking the magnifying glass button before moving to the next one.',
          timestamp: new Date()
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          content: '🚫 **Cannot Skip Steps!** You must complete each step in order. Please go back and complete any missing steps.',
          timestamp: new Date()
        }]);
      }
      return;
    }
    
    if (nextStepIndex < guidedProject.steps.length) {
      setGuidedProject({
        ...guidedProject,
        currentStep: nextStepIndex
      });
      
      // Check if the next step is already completed
      const nextStepId = guidedProject.steps[nextStepIndex]?.id;
      if (nextStepId && isStepCompleted(nextStepId)) {
        setStepComplete(true);
      } else {
        setStepComplete(false);
      }
      
      const nextStep = guidedProject.steps[nextStepIndex];
      // Removed chat message about moving to next step
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
  // Removed: handleCheckStepWithScroll - Backend now handles step checking
  const handleNextStepWithScroll = () => {
    handleNextStep();
    setTimeout(scrollToGuidedStep, 100);
  };

  const handleStopGuidedProject = () => {
    setGuidedProject(null);
    setCompletedSteps(new Set());
    setStepComplete(false);
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [projectCount, setProjectCount] = useState(0);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [completionRecap, setCompletionRecap] = useState('');

  const refreshUserData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('project_count, payment_status, has_unlimited_access')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        setProjectCount(profile.project_count || 0);
        setHasUnlimitedAccess(
          profile.payment_status === 'paid' ||
          profile.has_unlimited_access === true
        );
      }
    } catch (e) {
      // ignore
    }
  }, []);


  const handleFinishProject = async () => {
    // Trigger celebration effects
    console.log('🎉 Project completed! Playing celebration sequence...');
    
    setShowCongrats(true);
    setGuidedProject(null);
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: '🎉 Congratulations! You\'ve completed the guided project! You\'re doing amazing!',
      timestamp: new Date()
    }]);
    
    // Log to terminal for user feedback
    setOutput(prev => [...prev, 
      `🎉 PROJECT COMPLETED! 🎉`,
      `   Congratulations on finishing your guided project!`,
      `   You've learned valuable coding skills and built something amazing.`,
      `   Keep coding, sipping coffee, and learning new things!`,
      ``
    ]);

    // Increment project count on completion, generate recap, and refresh user data
    try {
      if (session?.access_token) {
        // Try primary endpoint
        let resp = await fetch('/api/guided/completeProject', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            projectId: guidedProject?.projectId || null,
            projectFiles: files,
            chatHistory: chatMessages,
            guidedProject
          }),
        });

        // Fallback to older endpoint if route not found
        if (resp.status === 404) {
          resp = await fetch('/api/account/incrementProjectCount', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({}),
          });
        }

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setOutput(prev => [
            ...prev,
            '⚠️ Could not record project completion to your account.',
            data?.error ? `   Reason: ${data.error}` : '   Please try refreshing your dashboard.',
          ]);
        } else {
          if (typeof data?.recap === 'string') {
            setCompletionRecap(data.recap);
          }
          setOutput(prev => [
            ...prev,
            `✅ Project recorded. Total completed projects: ${data?.project_count ?? 'updated'}`,
          ]);
        }
      }
    } catch (e) {
      // Non-fatal: continue
      setOutput(prev => [
        ...prev,
        '⚠️ A network error occurred while updating your project count.',
      ]);
    }

    try { await refreshUserData(); } catch (_) {}
  };



  // Inject CSS keyframes for shimmer animation
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Load files when component mounts and session is available
  useEffect(() => {
    if (session?.access_token) {
      loadFiles();
    }
  }, [session?.access_token]); // Only depend on session token, not the loadFiles function

  // Add state to track if the terminal has been initialized
  const [terminalInitialized, setTerminalInitialized] = useState(false);

  // Memoize the Terminal component so it is not remounted on tab switch
  const memoizedTerminal = useMemo(() => <Terminal />, []);

  // New handler for returning to the chat from the steps preview
  const handleReturnToChat = () => {
    setShowStepsPreviewModal(false); // Close the modal
    setIsInSetupPhase(true); // Re-enter setup/chat phase
    setIsInFollowUpPhase(true); // Enter follow-up phase
    setShowSubmitButton(false); // Hide submit button initially
    
    // Add initial message
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      content: "What else would you like to add to your project?",
      timestamp: new Date()
    }]);
  };



  // Handle user response to follow-up suggestions
  const handleFollowUpResponse = async (userMessageContent: string) => {
    setIsTyping(true);
    
    try {
      // Use the user message that was passed to this function
      const currentUserMessage = userMessageContent;
      
      // Make a lightweight AI call with the CURRENT user message for accurate response
      const response = await fetch('/api/guided/simple-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          history: [{ type: 'user', content: currentUserMessage }]
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.response?.content) {
          setChatMessages(prev => [...prev, { 
            type: 'assistant', 
            content: result.response.content, 
            timestamp: new Date() 
          }]);
          
        

        } else {
          // Fallback response
          setChatMessages(prev => [...prev, { 
            type: 'assistant', 
            content: "Thanks for sharing that!", 
            timestamp: new Date() 
          }]);
        }
      } else {
        // Fallback response
        setChatMessages(prev => [...prev, { 
          type: 'assistant', 
          content: "Thanks for sharing that!", 
          timestamp: new Date() 
        }]);
      }
    } catch (error) {
      console.error('Error in follow-up response:', error);
      // Fallback response
      setChatMessages(prev => [...prev, { 
        type: 'assistant', 
        content: "Thanks for sharing that!", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsTyping(false);
      // Show submit button after user responds
      setShowSubmitButton(true);
      
      // Add delayed message to prompt user to generate steps
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          type: 'assistant', 
          content: "Perfect! When you're ready, hit the 'Generate Steps' button to build your project roadmap", 
          timestamp: new Date() 
        }]);
      }, 1300); // 1.5 second delay
    }
  };

  return (
    <ProtectedRoute>
      <div className={`flex flex-col h-screen bg-light-cream text-dark-charcoal transition-colors duration-150 ${isInSetupPhase ? 'dim-layout' : ''}`}>
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-cream-beige bg-light-cream shadow-lg ide-dimmable">
    
                 <div className="flex items-center space-x-1">
           <button 
            onClick={() => {
              setIsNavigatingBack(true);
              router.replace('/');
            }} 
            className="p-2 rounded-full hover:bg-cream-beige transition-colors duration-150 disabled:opacity-50"
            disabled={isNavigatingBack}
          >
            {isNavigatingBack ? (
              <IconLoader2 className="h-5 w-5 text-deep-espresso animate-spin" />
            ) : (
            <IconArrowLeft className="h-5 w-5 text-deep-espresso" />
            )}
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
                onRefresh={handleSmartRefresh}
                isLoading={isLoadingFiles}
                highlightedFileId={highlightedFileId}
                stepProgression={null}
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
                      <div className="flex items-center space-x-1 text-sm text-deep-espresso">
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
                        onEditorMount={(editor, monaco) => {
                          console.log('🔍 [IDE] MonacoEditor mounted for file:', selectedFile.name);
                          console.log('🔍 [IDE] Language:', selectedFile.language || 'plaintext');
                          console.log('🔍 [IDE] Available Monaco languages:', monaco.languages.getLanguages().map((l: any) => l.id));
                        }}
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
                      ) : filesError ? (
                        <div className="flex items-center justify-center h-full bg-red-50">
                          <div className="text-center">
                            <div>
                              <IconX className="h-16 w-16 text-red-500 mx-auto mb-4" />
                              <p className="text-red-800 text-lg">Failed to load files</p>
                              <p className="text-red-600 text-sm mt-2">{filesError}</p>
                              <button 
                                onClick={loadFiles}
                                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                              >
                                Try Again
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : files.length === 0 ? (
                        <div className="flex items-center justify-center h-full bg-cream-beige/20">
                          <div className="text-center">
                            <IconCode className="h-16 w-16 text-medium-coffee mx-auto mb-4" />
                            <p className="text-deep-espresso text-lg">No files found</p>
                            <p className="text-deep-espresso/70 text-sm mt-2">Create your first file to start coding</p>
                           
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full bg-cream-beige/20">
                          <div className="text-center">
                            <IconCode className="h-16 w-16 text-medium-coffee mx-auto mb-4" />
                            <p className="text-deep-espresso text-lg">Select a file to start coding</p>
                            <p className="text-deep-espresso/70 text-sm mt-2">Choose a file from the explorer on the left</p>
                          </div>
                        </div>
                      )}
                  </TabsContent>

                  <TabsContent value="preview" className="flex-1 m-0" isInSetupPhase={isInSetupPhase}>
                    {selectedFile && selectedFile.name.match(/\.(png|jpe?g|gif|bmp|webp|svg)$/i) ? (
                      <div className="w-full h-full flex items-center justify-center bg-white">
                        {imagePreviewUrl ? (
                          <img
                            src={imagePreviewUrl}
                            alt={selectedFile.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="text-deep-espresso/70 text-sm">Loading image...</div>
                        )}
                      </div>
                    ) : selectedFile?.language === 'html' ? (
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
                      paddingLeft: '10px',
                      paddingBottom: '15px',
                      boxSizing: 'border-box',
                      display: activeTab === 'terminal' ? 'block' : 'none',
                      overflowX: 'auto', // Enable horizontal scroll
                      overflowY: 'auto',
                    }}
                  >
                    {memoizedTerminal}
                  </div>

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
                            <div className="text-base">
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
                 
                    
                      
                      {(isInSetupPhase && !isInFollowUpPhase) || isInFollowUpPhase ? (
                        // Show the Generate Steps button only when not actively generating
                        !isGeneratingSteps && (
                          <Button
                            onClick={handleSubmitAndGenerateSteps}
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-light-cream border-2 border-medium-coffee/30 text-medium-coffee hover:text-deep-espresso px-3 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-md text-base"
                          >
                            Generate Steps
                          </Button>
                        )
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
            countUpSpeed={20}
            dynamicMessages={[
              "Analyzing your project description...",
              "Creating step-by-step learning path...",
              "Customizing steps for your skill level...",
              "Adding helpful hints and guidance...",
              "Finalizing your project roadmap..."
            ]}
            messageInterval={4000}
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
          progressSpeed="slow"
          spinnerSize="large"
          countUpProgress={true}
                      countUpSpeed={15}
          dynamicMessages={[
            "Creating guided steps and preparing your workspace...",
            "Setting up project files and structure...",
            "Configuring your development environment...",
            "Preparing your personalized learning path...",
            "Almost ready to start coding..."
          ]}
          messageInterval={3500}
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
          onReturnToChat={handleReturnToChat}
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
                  className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all duration-200 hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  onClick={() => handleFileDelete(pendingDeleteFolderId)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <ProjectCompletionModal 
          isOpen={showCongrats} 
          onClose={() => {
            setShowCongrats(false);
            setShowRecap(false);
            setCompletionRecap('');
          }}
          projectFiles={files}
          chatHistory={chatMessages}
          guidedProject={guidedProject}
          session={session}
          recap={completionRecap}
        />

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          projectCount={projectCount}
          onPaymentSuccess={async () => {
            setShowPaymentModal(false);
            await refreshUserData();
          }}
        />

        {/* Keep Guided Steps visible globally, independent of Explorer state */}
        {guidedProject && (
          <GuidedStepPopup
            instruction={guidedProject.steps[guidedProject.currentStep]?.instruction}
            isComplete={isStepCompleted(guidedProject.steps[guidedProject.currentStep]?.id || '')}
            onNextStep={handleNextStep}
            onPreviousStep={handlePreviousStep}
            onCheckStep={handleCheckStep}
            stepNumber={guidedProject.currentStep + 1}
            totalSteps={guidedProject.steps.length}
            isChecking={isCheckingStep}
            onFinish={handleFinishProject}
            completedSteps={getProjectCompletionStatus().completed}
            totalCompleted={getProjectCompletionStatus().total}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// Wrap export
export default function ProtectedIDEPageWrapper() {
  return <IDEPage />;
}
