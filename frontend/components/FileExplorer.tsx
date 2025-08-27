'use client';

import React, { useState, useMemo } from 'react';
import {
  File,
  Folder,
  FolderOpen,
  Plus,
  FileText,
  Code,
  Globe,
  Palette,
  FileCode2,
  Search,
  Menu,
  RefreshCw,
  Trash2
} from 'lucide-react';
import ProjectSetupLoader from './ProjectSetupLoader';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
  size?: number;
  modified?: Date;
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
  onRefresh?: () => void;
  onFileSelect?: (file: FileNode) => void;
  isLoading?: boolean;
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
    'js','ts','py','java','cpp','c','cs','go','rb','php','html','css','json','xml','sh','md','swift','kt','rs','sql','yaml','yml','dockerfile','bat','pl','r','scala','lua','dart','ini','makefile','toml','vue','svelte','scss','less','coffee','h','tsx','jsx','txt','env','gitignore','npmrc','babelrc','eslintrc','prettierrc','config'
  ].includes(extension || '') || fileName === 'Dockerfile' || fileName === 'Makefile' || fileName.includes('.');
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
  onRename: (fileId: string, newName: string) => void;
  onCopy: (fileId: string) => void;
  onCut: (fileId: string) => void;
  onMove?: (fileId: string, newParentId: string | null) => void;
  selectedFileId: string | null;
  onCreateFile: (parentId: string | null, type: 'file' | 'folder', name: string) => void;
  onCreateFolder: (parentId: string | null, type: 'file' | 'folder', name: string) => void;
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
  onRename,
  onCopy,
  onCut,
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
  // Change isExpanded default to false
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Don't render if we've exceeded max depth
  if (level > maxDepth) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(node);
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
        // Only search current node name when folders are collapsed
        return node.name.toLowerCase().includes(term);
    }
  }, [searchTerm, searchFilter, node]);

  if (!matchesSearch) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (onDragStart && onMove) {
      onDragStart(node.id);
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragOver(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (onMove && draggedFileId && draggedFileId !== node.id && node.type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
          title={node.id}
        >
          {node.name}
          {node.id.includes('/') && (
            <span className="ml-2 text-xs text-gray-400 font-mono">
              {node.id.substring(0, node.id.lastIndexOf('/'))}
            </span>
          )}
        </span>
        
        {showActions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {node.type === 'folder' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFile(node.id, 'file', '');
                  }}
                  className="p-1 hover:bg-cream-beige rounded"
                  title="New File"
                >
                  <Plus className="h-3 w-3 text-deep-espresso" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(node.id, 'folder', '');
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
              <Trash2 className="h-3 w-3 text-deep-espresso" />
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
              onRename={onRename}
              onCopy={onCopy}
              onCut={onCut}
              onMove={onMove}
              selectedFileId={selectedFileId}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              searchTerm={searchTerm}
              searchFilter={searchFilter}
              maxDepth={maxDepth}
              draggedFileId={draggedFileId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
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
function getPathFromId(id: string, files: FileNode[]): string {
  // In this new structure, id IS the path already.
  return id;
}

// Helper: Build path from parentId and name
function buildPathFromId(parentId: string | null, name: string, files: FileNode[]): string {
  // If creating at the root (parentId is null or '.'), just use the name
  if (!parentId || parentId === '.' || parentId === '/') return name;
  return parentId + '/' + name;
}

// Helper: Get parent id from file id
function getParentId(id: string, files: FileNode[]): string | null {
  const parts = id.split('/');
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join('/') || '.';
}

export default function FileExplorer({
  files,
  selectedFileId,
  isCollapsed = false,
  onToggleCollapse,
  stepProgression,
  onRefresh,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileMove,
  isLoading = false,
}: FileExplorerProps) {
  const [error, setError] = useState<string | null>(null);

  // UI: Create file/folder dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [draggedFileId, setDraggedFileId] = useState<string | undefined>(undefined);

  const handleFileSelect = (file: FileNode) => {
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  // UI: Create file/folder dialog
  const handleShowCreate = (parentId: string | null, type: 'file' | 'folder' = 'file') => {
    setCreateParentId(parentId);
    setCreateType(type);
    setShowCreateDialog(true);
    setNewName('');
  };
  
  const handleCreateConfirm = async () => {
    if (!newName.trim()) return;
    if (createType === 'file' && !newName.trim().includes('.')) {
      alert('Please provide a valid file extension!');
      return;
    }
    onFileCreate(createParentId, createType, newName.trim());
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
        onDelete={onFileDelete}
        onRename={() => {}}
        onCopy={() => {}}
        onCut={() => {}}
        onMove={onFileMove}
        selectedFileId={selectedFileId}
        onCreateFile={(parentId, type, name) => handleShowCreate(parentId, type)}
        onCreateFolder={(parentId, type, name) => handleShowCreate(parentId, type)}
        searchTerm={searchTerm}
        searchFilter={searchFilter}
        maxDepth={10}
        draggedFileId={draggedFileId}
        onDragStart={setDraggedFileId}
        onDragEnd={() => setDraggedFileId(undefined)}
        onDrop={() => {}}
      />
    ));

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
            onClick={() => {
              const parentId = selectedFileId ? getParentId(selectedFileId, files) : null;
              handleShowCreate(parentId, 'file');
            }}
            className="p-1 hover:bg-cream-beige rounded"
            title="New File"
          >
            <Plus className="h-4 w-4 text-deep-espresso" />
          </button>
          <button
            onClick={() => {
              const parentId = selectedFileId ? getParentId(selectedFileId, files) : null;
              handleShowCreate(parentId, 'folder');
            }}
            className="p-1 hover:bg-cream-beige rounded"
            title="New Folder"
          >
            <Folder className="h-4 w-4 text-deep-espresso" />
          </button>

          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-cream-beige rounded"
            title="Refresh File List"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-deep-espresso ${isLoading ? 'animate-spin' : ''}`} />
          </button>

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
        
        {/* Refresh Progress Indicator */}
        {isLoading && (
          <div className="mt-2 p-2 bg-medium-coffee/10 border border-medium-coffee/20 rounded text-xs text-medium-coffee">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-medium-coffee rounded-full animate-pulse"></div>
              <span>Refreshing...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-100 border border-red-300 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {/* File Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 pt-4">
        <div className="min-w-max">
          {isLoading ? (
            <ProjectSetupLoader 
              isOpen={isLoading}
              title="Loading Files"
              description="Reading your project structure..."
              showProgress={false}
            />
          ) : files.length === 0 ? (
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
            <label className="block text-sm font-medium mb-4">
              {createType === 'file' ? 'File Name' : 'Folder Name'}
            </label>
            <input
              className="bg-cream-beige px-3 py-2 rounded w-full mb-3 focus:outline-none focus:ring-2 focus:ring-medium-coffee focus:border-transparent text-medium-coffee text-bas font-medium"
              placeholder={createType === 'file' ? 'e.g. main.py, app.js, index.html' : 'e.g. components, src, assets'}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateConfirm(); }}
              autoFocus
            />
            {createType === 'file' && (
              <p className="text-xs text-brown-900/80 mb-2">Include file extension (e.g. .py, .js, .html, .css)</p>
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