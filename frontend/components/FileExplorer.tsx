'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  File,
  Folder,
  FolderOpen,
  Plus,
  X,
  FileText,
  Code,
  Globe,
  Palette,
  FileCode2,
  Search,
  Menu,
  GripVertical
} from 'lucide-react';

// Add axios for API calls
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileCreate: (parentId: string | null, type: 'file' | 'folder', name: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileMove?: (fileId: string, newParentId: string | null) => void;
  selectedFileId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  stepProgression?: React.ReactNode;
  onRefresh?: () => void; // <-- Add this prop
  onFileSelect?: (file: FileNode) => void;
}

type SearchFilter = 'all' | 'name';

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'py':
      return <Code className="h-5 w-5 text-green-600 flex-shrink-0" />;
    case 'js':
    case 'jsx':
      return <FileCode2 className="h-5 w-5 text-yellow-400 flex-shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileCode2 className="h-5 w-5 text-blue-400 flex-shrink-0" />;
    case 'java':
      return <FileCode2 className="h-5 w-5 text-red-600 flex-shrink-0" />;
    case 'cpp':
    case 'c':
    case 'h':
      return <FileCode2 className="h-5 w-5 text-indigo-500 flex-shrink-0" />;
    case 'cs':
      return <FileCode2 className="h-5 w-5 text-purple-500 flex-shrink-0" />;
    case 'go':
      return <FileCode2 className="h-5 w-5 text-cyan-600 flex-shrink-0" />;
    case 'rb':
      return <FileCode2 className="h-5 w-5 text-pink-500 flex-shrink-0" />;
    case 'php':
      return <FileCode2 className="h-5 w-5 text-indigo-400 flex-shrink-0" />;
    case 'html':
      return <Globe className="h-5 w-5 text-orange-500 flex-shrink-0" />;
    case 'css':
      return <Palette className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    case 'json':
      return <FileText className="h-5 w-5 text-amber-500 flex-shrink-0" />;
    case 'xml':
      return <FileText className="h-5 w-5 text-purple-400 flex-shrink-0" />;
    case 'sh':
      return <FileCode2 className="h-5 w-5 text-gray-600 flex-shrink-0" />;
    case 'md':
      return <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />;
    case 'swift':
      return <FileCode2 className="h-5 w-5 text-orange-400 flex-shrink-0" />;
    case 'kt':
      return <FileCode2 className="h-5 w-5 text-pink-400 flex-shrink-0" />;
    case 'rs':
      return <FileCode2 className="h-5 w-5 text-orange-700 flex-shrink-0" />;
    case 'sql':
      return <FileCode2 className="h-5 w-5 text-blue-700 flex-shrink-0" />;
    case 'yaml':
    case 'yml':
      return <FileText className="h-5 w-5 text-yellow-700 flex-shrink-0" />;
    case 'dockerfile':
      return <FileCode2 className="h-5 w-5 text-blue-400 flex-shrink-0" />;
    case 'bat':
      return <FileCode2 className="h-5 w-5 text-gray-700 flex-shrink-0" />;
    case 'pl':
      return <FileCode2 className="h-5 w-5 text-pink-700 flex-shrink-0" />;
    case 'r':
      return <FileCode2 className="h-5 w-5 text-blue-400 flex-shrink-0" />;
    case 'scala':
      return <FileCode2 className="h-5 w-5 text-red-700 flex-shrink-0" />;
    case 'lua':
      return <FileCode2 className="h-5 w-5 text-indigo-700 flex-shrink-0" />;
    case 'dart':
      return <FileCode2 className="h-5 w-5 text-cyan-700 flex-shrink-0" />;
    case 'ini':
      return <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />;
    case 'makefile':
      return <FileCode2 className="h-5 w-5 text-gray-500 flex-shrink-0" />;
    case 'toml':
      return <FileText className="h-5 w-5 text-green-700 flex-shrink-0" />;
    case 'vue':
      return <FileCode2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
    case 'svelte':
      return <FileCode2 className="h-5 w-5 text-orange-600 flex-shrink-0" />;
    case 'scss':
      return <Palette className="h-5 w-5 text-pink-400 flex-shrink-0" />;
    case 'less':
      return <Palette className="h-5 w-5 text-blue-300 flex-shrink-0" />;
    case 'coffee':
      return <FileCode2 className="h-5 w-5 text-yellow-700 flex-shrink-0" />;
    default:
      return <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />;
  }
};

const isValidFileExtension = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return [
    'js','ts','py','java','cpp','c','cs','go','rb','php','html','css','json','xml','sh','md','swift','kt','rs','sql','yaml','yml','dockerfile','bat','pl','r','scala','lua','dart','ini','makefile','toml','vue','svelte','scss','less','coffee','h','tsx','jsx'
  ].includes(extension || '');
};

const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'cpp': return 'cpp';
    case 'c': return 'c';
    case 'cs': return 'csharp';
    case 'go': return 'go';
    case 'rb': return 'ruby';
    case 'php': return 'php';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'xml': return 'xml';
    case 'sh': return 'shell';
    case 'md': return 'markdown';
    case 'swift': return 'swift';
    case 'kt': return 'kotlin';
    case 'rs': return 'rust';
    case 'sql': return 'sql';
    case 'yaml':
    case 'yml': return 'yaml';
    case 'dockerfile': return 'dockerfile';
    case 'bat': return 'bat';
    case 'pl': return 'perl';
    case 'r': return 'r';
    case 'scala': return 'scala';
    case 'lua': return 'lua';
    case 'dart': return 'dart';
    case 'ini': return 'ini';
    case 'makefile': return 'makefile';
    case 'toml': return 'toml';
    case 'vue': return 'vue';
    case 'svelte': return 'svelte';
    case 'scss': return 'scss';
    case 'less': return 'less';
    case 'coffee': return 'coffeescript';
    case 'h': return 'cpp';
    case 'tsx': return 'typescript';
    case 'jsx': return 'javascript';
    default: return 'plaintext';
  }
};

const FileTreeNode: React.FC<{
  node: FileNode;
  level: number;
  onSelect: (file: FileNode) => void;
  onDelete: (fileId: string) => void;
  onMove?: (fileId: string, newParentId: string | null) => void;
  selectedFileId: string | null;
  onCreateFile: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
  searchTerm: string;
  searchFilter: SearchFilter;
  maxDepth?: number;
  draggedFileId?: string;
  onDragStart?: (fileId: string) => void;
  onDragEnd?: () => void;
  onDrop?: (targetFileId: string) => void;
}> = ({ 
  node, 
  level, 
  onSelect, 
  onDelete, 
  onMove,
  selectedFileId, 
  onCreateFile, 
  onCreateFolder, 
  searchTerm, 
  searchFilter,
  maxDepth = 10,
  draggedFileId,
  onDragStart,
  onDragEnd,
  onDrop
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Don't render if we've exceeded max depth
  if (level > maxDepth) {
    return null;
  }

  const handleClick = () => {
    if (node.type === 'file') {
      onSelect(node);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // Enhanced search logic with filters
  const matchesSearch = useMemo(() => {
    if (searchTerm === '') return true;
    
    const term = searchTerm.toLowerCase();
    
    switch (searchFilter) {
      case 'name':
        // Search by name only
        return node.name.toLowerCase().includes(term);
        
      case 'all':
      default:
        // Search by name and check if children match
        return node.name.toLowerCase().includes(term) ||
          (node.children && node.children.some(child => 
            child.name.toLowerCase().includes(term)
          ));
    }
  }, [searchTerm, searchFilter, node]);

  if (!matchesSearch) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart && onMove) {
      onDragStart(node.id);
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragOver(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (onMove && draggedFileId && draggedFileId !== node.id && node.type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (draggedFileId && draggedFileId !== node.id && onDrop && node.type === 'folder') {
      onDrop(node.id);
    }
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-2 py-1 cursor-pointer rounded group relative
          transition-colors duration-150 my-0.5
          ${selectedFileId === node.id
            ? 'bg-medium-coffee text-light-cream font-semibold border-l-4 border-orange-400'
            : 'hover:bg-cream-beige text-deep-espresso'}
          ${isDragOver ? 'bg-medium-coffee/20 border-2 border-medium-coffee border-dashed' : ''}
        `}
        style={{ paddingLeft: `${Math.min(level * 16 + 8, 200)}px` }}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        draggable={!!onMove}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag handle */}
        {onMove && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3 w-3 text-deep-espresso/50 flex-shrink-0" />
          </div>
        )}
        
        {node.type === 'folder' ? (
          isExpanded ? (
            <FolderOpen className="h-5 w-5 text-orange-400 flex-shrink-0" />
          ) : (
            <Folder className="h-5 w-5 text-orange-400 flex-shrink-0" />
          )
        ) : (
          getFileIcon(node.name)
        )}
        <span 
          className="text-sm flex-1 min-w-0 truncate font-mono"
          title={node.name}
        >
          {node.name}
        </span>
        
        {showActions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {node.type === 'folder' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFile(node.id);
                  }}
                  className="p-1 hover:bg-cream-beige rounded"
                  title="New File"
                >
                  <Plus className="h-3 w-3 text-deep-espresso" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(node.id);
                  }}
                  className="p-1 hover:bg-cream-beige rounded"
                  title="New Folder"
                >
                  <Folder className="h-3 w-3 text-deep-espresso" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1 hover:bg-deep-espresso rounded"
              title="Delete"
            >
              <X className="h-3 w-3 text-deep-espresso" />
            </button>
          </div>
        )}
      </div>
      
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              onMove={onMove}
              selectedFileId={selectedFileId}
              onCreateFile={(parentId) => handleShowCreate(parentId, 'file')}
              onCreateFolder={(parentId) => handleShowCreate(parentId, 'folder')}
              searchTerm={searchTerm}
              searchFilter={searchFilter}
              maxDepth={maxDepth}
              draggedFileId={draggedFileId}
              onDragStart={setDraggedFileId}
              onDragEnd={() => setDraggedFileId(undefined)}
              onDrop={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper: Convert backend recursive file list to FileNode tree
function convertBackendFilesToTree(backendFiles: any[]): FileNode[] {
  // backendFiles: [{ name, isDirectory } ...] with paths like 'src/index.js'
  const root: { [key: string]: FileNode } = {};
  for (const file of backendFiles) {
    const parts = file.name.split('/');
    let current = root;
    let pathSoFar = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      pathSoFar = pathSoFar ? pathSoFar + '/' + part : part;
      if (!current[part]) {
        const isFolder = (i < parts.length - 1) || file.isDirectory;
        current[part] = {
          id: pathSoFar,
          name: part,
          type: isFolder ? 'folder' : 'file',
          children: isFolder ? [] : undefined,
        };
      }
      if (i === parts.length - 1) {
        // Mark as file or folder
        current[part].type = file.isDirectory ? 'folder' : 'file';
      }
      if (i < parts.length - 1) {
        // Find or create the child folder in the array
        let child = (current[part].children as FileNode[]);
        // Convert array to object for next iteration
        let childObj: { [key: string]: FileNode } = {};
        for (const c of child) {
          childObj[c.name] = c;
        }
        current[part].children = child;
        current = childObj;
      }
    }
  }
  // Convert root object to array recursively
  function toArray(obj: { [key: string]: FileNode }): FileNode[] {
    return Object.values(obj).map((node) =>
      node.type === 'folder' && node.children
        ? { ...node, children: toArray(arrayToObj(node.children)) }
        : { ...node }
    );
  }
  // Helper to convert array of FileNode to object by name
  function arrayToObj(arr: FileNode[] = []): { [key: string]: FileNode } {
    const obj: { [key: string]: FileNode } = {};
    for (const node of arr) {
      obj[node.name] = node;
    }
    return obj;
  }
  return toArray(root);
}

// Helper: Find a node by id in the tree
function findNodeById(id: string, nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'folder' && node.children) {
      const found = findNodeById(id, node.children);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Get path from id (id is the path)
function getPathFromId(id: string, nodes: FileNode[]): string {
  return id;
}

// Helper: Build path from parentId and name
function buildPathFromId(parentId: string | null, name: string, nodes: FileNode[]): string {
  if (!parentId || parentId === '.') return name;
  return parentId + '/' + name;
}

// Helper: Get parent id from file id
function getParentId(id: string, nodes: FileNode[]): string | null {
  const parts = id.split('/');
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join('/') || '.';
}

export default function FileExplorer({
  selectedFileId,
  isCollapsed = false,
  onToggleCollapse,
  stepProgression,
  onRefresh,
  onFileSelect,
}: Omit<FileExplorerProps, 'files' | 'onFileCreate' | 'onFileDelete' | 'onFileMove'>) {
  // Get Supabase session for authentication
  const { session } = useAuth();
  
  // Internal state for file tree
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Helper to get auth headers
  const getAuthHeaders = () => {
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  // UI: Create file/folder dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [draggedFileId, setDraggedFileId] = useState<string | undefined>(undefined);

  // Fetch file tree from backend
  const fetchFiles = async () => {
    if (!session?.access_token) {
      setError('Authentication required');
        return;
      }
      
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('http://localhost:8000/api/files/list?recursive=true', {
        headers: getAuthHeaders()
      });
      // Adapt backend data to FileNode[]
      const nodes = convertBackendFilesToTree(res.data.files);
      setFiles(nodes);
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchFiles();
    }
    // eslint-disable-next-line
  }, [refreshFlag, session]);

  // Helper to trigger refresh
  const triggerRefresh = () => setRefreshFlag(f => f + 1);

  // Fetch file content from backend
  const fetchFileContent = async (file: FileNode) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/files/read`, {
        params: { path: file.id },
        headers: getAuthHeaders(),
      });
      return res.data.data;
    } catch (err) {
      return '';
    }
  };

  // File select handler
  const handleFileSelect = async (file: FileNode) => {
    if (file.type === 'file') {
      const content = await fetchFileContent(file);
      const language = getLanguageFromFileName(file.name);
      const fileWithContent = { ...file, content, language };
      setSelectedFile(fileWithContent);
      if (onFileSelect) onFileSelect(fileWithContent);
    }
  };

  // File operations
  const handleCreate = async (parentId: string | null, type: 'file' | 'folder', name: string) => {
    try {
      await axios.post('http://localhost:8000/api/files/create', 
        { path: buildPathFromId(parentId, name, files), isFolder: type === 'folder' },
        { headers: getAuthHeaders() }
      );
      triggerRefresh();
    } catch (err) {
      alert('Failed to create ' + type);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await axios.delete('http://localhost:8000/api/files/delete', { 
        data: { path: getPathFromId(fileId, files) },
        headers: getAuthHeaders()
      });
      triggerRefresh();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleRename = async (fileId: string, newName: string) => {
    try {
      const oldPath = getPathFromId(fileId, files);
      const newPath = buildPathFromId(getParentId(fileId, files), newName, files);
      await axios.post('http://localhost:8000/api/files/rename', 
        { oldPath, newPath },
        { headers: getAuthHeaders() }
      );
      triggerRefresh();
    } catch (err) {
      alert('Failed to rename');
    }
  };

  // UI: Create file/folder dialog
  const handleShowCreate = (parentId: string | null, type: 'file' | 'folder') => {
    setCreateParentId(parentId);
    setCreateType(type);
    setShowCreateDialog(true);
    setNewName('');
  };
  const handleCreateConfirm = async () => {
    if (!newName.trim()) return;
    if (createType === 'file' && !isValidFileExtension(newName.trim())) {
      alert('Only .py, .css, .html, .js files allowed!');
      return;
    }
    await handleCreate(createParentId, createType, newName.trim());
    setShowCreateDialog(false);
    setNewName('');
  };

  // UI: Render file tree
  const renderTree = (nodes: FileNode[], level = 0) =>
    nodes.map((file) => (
      <FileTreeNode
        key={file.id}
        node={file}
        level={level}
        onSelect={handleFileSelect}
        onDelete={handleDelete}
        onMove={undefined}
        selectedFileId={selectedFileId}
        onCreateFile={(parentId) => handleShowCreate(parentId, 'file')}
        onCreateFolder={(parentId) => handleShowCreate(parentId, 'folder')}
        searchTerm={searchTerm}
        searchFilter={searchFilter}
        maxDepth={10}
        draggedFileId={draggedFileId}
        onDragStart={setDraggedFileId}
        onDragEnd={() => setDraggedFileId(undefined)}
        onDrop={undefined}
      />
    ));

  // UI: Refresh button
  const handleRefresh = () => {
    triggerRefresh();
    if (onRefresh) onRefresh();
  };

  if (isCollapsed) {
    return (
      <div className="h-full bg-light-cream border-r border-cream-beige flex flex-col">
        <div className="flex items-center justify-center p-2 border-b border-cream-beige">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-cream-beige rounded transition-colors duration-200"
            title="Expand Explorer"
          >
            <Menu className="h-4 w-4 text-deep-espresso hover:text-medium-coffee" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center space-y-2">
          <div className="p-2 rounded-lg bg-cream-beige/50 hover:bg-cream-beige transition-colors duration-200">
            <File className="h-5 w-5 text-deep-espresso" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-light-cream">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-cream-beige flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-cream-beige rounded"
            title="Collapse Explorer"
          >
            <Menu className="h-4 w-4 text-deep-espresso" />
          </button>
          <h3 className="text-sm font-semibold text-deep-espresso">Explorer</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleShowCreate(null, 'file')}
            className="p-1 hover:bg-cream-beige rounded"
            title="New File"
          >
            <Plus className="h-4 w-4 text-deep-espresso" />
          </button>
          <button
            onClick={() => handleShowCreate(null, 'folder')}
            className="p-1 hover:bg-cream-beige rounded"
            title="New Folder"
          >
            <Folder className="h-4 w-4 text-deep-espresso" />
          </button>
          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-cream-beige rounded"
              title="Refresh File List"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-deep-espresso">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.582 9A7.003 7.003 0 0012 19a7 7 0 006.418-4M18.418 15A7.003 7.003 0 0012 5a7 7 0 00-6.418 4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-cream-beige flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-deep-espresso/70" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1 bg-cream-beige text-dark-charcoal text-sm border border-medium-coffee/30 rounded focus:outline-none focus:ring-2 focus:ring-medium-coffee focus:border-transparent"
          />
        </div>
      </div>
      
      {/* File Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 pt-4">
        <div className="min-w-max">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <File className="h-8 w-8 text-deep-espresso/50 mb-2" />
              <p className="text-deep-espresso/70 text-sm">No files yet</p>
              <p className="text-deep-espresso/50 text-xs mt-1">Create your first file to get started</p>
            </div>
          ) : (
            renderTree(files)
          )}
        </div>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-brown-200 text-brown-900 rounded-xl shadow-2xl p-8 min-w-[300px] max-w-sm w-full">
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
              {createType === 'file' ? <File className="h-5 w-5" /> : <Folder className="h-5 w-5" />} Create {createType === 'file' ? 'File' : 'Folder'}
            </h2>
            <label className="block text-sm font-medium mb-1">
              {createType === 'file' ? 'File Name' : 'Folder Name'}
            </label>
            <input
              className="bg-cream-beige px-3 py-2 rounded w-full mb-3 focus:outline-none focus:ring-2 focus:ring-medium-coffee focus:border-transparent text-medium-coffee text-base"
              placeholder={createType === 'file' ? 'e.g. main.py' : 'e.g. components'}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateConfirm(); }}
              autoFocus
            />
            {createType === 'file' && (
              <p className="text-xs text-brown-900/80 mb-2">Allowed: .py, .css, .html, .js</p>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreateDialog(false)} className="px-4 py-1.5 rounded bg-cream-beige hover:bg-white text-deep-espresso font-medium">Cancel</button>
              <button onClick={handleCreateConfirm} className="px-4 py-1.5 rounded bg-medium-coffee hover:bg-opacity-80 text-white font-semibold shadow">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Step Progression UI */}
      {stepProgression && (
        <div className="w-full mt-auto" style={{ minHeight: 120, maxWidth: '100%' }}>
          {stepProgression}
        </div>
      )}
    </div>
  );
}