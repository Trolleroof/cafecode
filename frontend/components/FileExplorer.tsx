'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Trash2,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { Copy } from 'lucide-react';
import { FileNode, SearchFilter } from '@/types';

interface FileExplorerProps {
  files: FileNode[];
  onFileCreate: (parentId: string | null, type: 'file' | 'folder', name: string) => void | Promise<void>;
  onFileDelete: (fileId: string) => void;
  onFileMove?: (fileId: string, newParentId: string | null) => void;
  selectedFileId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  stepProgression?: React.ReactNode;
  onRefresh?: () => void;
  onFileSelect?: (file: FileNode) => void;
  isLoading?: boolean;
  highlightedFileId?: string | null;
}

const getFileIcon = (fileName: string) => {
  // Handle special filenames without extensions
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName === 'dockerfile' || lowerFileName.startsWith('dockerfile.')) {
    return <FileCode2 className="h-4 w-4 text-blue-400 flex-shrink-0" />;
  }
  if (lowerFileName === 'makefile' || lowerFileName === 'gnumakefile') {
    return <FileCode2 className="h-4 w-4 text-gray-500 flex-shrink-0" />;
  }
  if (lowerFileName === '.gitignore' || lowerFileName === '.gitattributes') {
    return <FileText className="h-4 w-4 text-orange-600 flex-shrink-0" />;
  }
  if (lowerFileName.startsWith('.env')) {
    return <FileText className="h-4 w-4 text-yellow-600 flex-shrink-0" />;
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    // Python
    case 'py':
    case 'pyw':
    case 'pyi':
      return <Code className="h-4 w-4 text-green-600 flex-shrink-0" />;
    
    // JavaScript/TypeScript
    case 'js':
    case 'mjs':
    case 'cjs':
      return <FileCode2 className="h-4 w-4 text-yellow-400 flex-shrink-0" />;
    case 'jsx':
      return <FileCode2 className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    case 'ts':
    case 'mts':
    case 'cts':
      return <FileCode2 className="h-4 w-4 text-blue-400 flex-shrink-0" />;
    case 'tsx':
      return <FileCode2 className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    
    // Java/Kotlin/Scala
    case 'java':
    case 'jar':
      return <FileCode2 className="h-4 w-4 text-red-600 flex-shrink-0" />;
    case 'kt':
    case 'kts':
      return <FileCode2 className="h-4 w-4 text-pink-400 flex-shrink-0" />;
    case 'scala':
    case 'sc':
      return <FileCode2 className="h-4 w-4 text-red-700 flex-shrink-0" />;
    
    // C/C++/C#
    case 'c':
    case 'h':
      return <FileCode2 className="h-4 w-4 text-indigo-500 flex-shrink-0" />;
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx':
      return <FileCode2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />;
    case 'cs':
    case 'csx':
      return <FileCode2 className="h-4 w-4 text-purple-500 flex-shrink-0" />;
    
    // Go/Rust
    case 'go':
    case 'mod':
    case 'sum':
      return <FileCode2 className="h-4 w-4 text-cyan-600 flex-shrink-0" />;
    case 'rs':
      return <FileCode2 className="h-4 w-4 text-orange-700 flex-shrink-0" />;
    
    // Ruby/PHP/Perl
    case 'rb':
    case 'rake':
    case 'gemspec':
      return <FileCode2 className="h-4 w-4 text-pink-500 flex-shrink-0" />;
    case 'php':
    case 'phtml':
      return <FileCode2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />;
    case 'pl':
    case 'pm':
      return <FileCode2 className="h-4 w-4 text-pink-700 flex-shrink-0" />;
    
    // Web Technologies
    case 'html':
    case 'htm':
    case 'xhtml':
      return <Globe className="h-4 w-4 text-orange-500 flex-shrink-0" />;
    case 'css':
      return <Palette className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    case 'scss':
    case 'sass':
      return <Palette className="h-4 w-4 text-pink-400 flex-shrink-0" />;
    case 'less':
      return <Palette className="h-4 w-4 text-blue-300 flex-shrink-0" />;
    case 'vue':
      return <FileCode2 className="h-4 w-4 text-green-500 flex-shrink-0" />;
    case 'svelte':
      return <FileCode2 className="h-4 w-4 text-orange-600 flex-shrink-0" />;
    
    // Data/Config Files
    case 'json':
    case 'jsonc':
    case 'json5':
      return <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" />;
    case 'xml':
    case 'xsl':
    case 'xslt':
      return <FileText className="h-4 w-4 text-purple-400 flex-shrink-0" />;
    case 'yaml':
    case 'yml':
      return <FileText className="h-4 w-4 text-yellow-700 flex-shrink-0" />;
    case 'toml':
      return <FileText className="h-4 w-4 text-green-700 flex-shrink-0" />;
    case 'ini':
    case 'cfg':
    case 'conf':
    case 'config':
      return <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    
    // Shell/Scripts
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return <FileCode2 className="h-4 w-4 text-gray-600 flex-shrink-0" />;
    case 'bat':
    case 'cmd':
    case 'ps1':
      return <FileCode2 className="h-4 w-4 text-gray-700 flex-shrink-0" />;
    
    // Documentation
    case 'md':
    case 'mdx':
    case 'markdown':
      return <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />;
    case 'rst':
    case 'txt':
      return <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    
    // Other Languages
    case 'swift':
      return <FileCode2 className="h-4 w-4 text-orange-400 flex-shrink-0" />;
    case 'r':
    case 'rmd':
      return <FileCode2 className="h-4 w-4 text-blue-400 flex-shrink-0" />;
    case 'sql':
      return <FileCode2 className="h-4 w-4 text-blue-700 flex-shrink-0" />;
    case 'lua':
      return <FileCode2 className="h-4 w-4 text-indigo-700 flex-shrink-0" />;
    case 'dart':
      return <FileCode2 className="h-4 w-4 text-cyan-700 flex-shrink-0" />;
    case 'coffee':
    case 'litcoffee':
      return <FileCode2 className="h-4 w-4 text-yellow-700 flex-shrink-0" />;
    
    // Default
    default:
      return <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />;
  }
};

const isValidFileExtension = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  
  // Special files without extensions
  if (['dockerfile', 'makefile', 'gnumakefile', '.gitignore', '.gitattributes'].includes(lowerFileName)) {
    return true;
  }
  
  // Files starting with .env
  if (lowerFileName.startsWith('.env')) {
    return true;
  }
  
  return [
    // JavaScript/TypeScript
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'mts', 'cts',
    // Python
    'py', 'pyw', 'pyi',
    // Java/Kotlin/Scala
    'java', 'jar', 'kt', 'kts', 'scala', 'sc',
    // C/C++/C#
    'c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'hxx', 'cs', 'csx',
    // Go/Rust
    'go', 'mod', 'sum', 'rs',
    // Ruby/PHP/Perl
    'rb', 'rake', 'gemspec', 'php', 'phtml', 'pl', 'pm',
    // Web
    'html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
    // Data/Config
    'json', 'jsonc', 'json5', 'xml', 'xsl', 'xslt', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'config',
    // Shell/Scripts
    'sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1',
    // Documentation
    'md', 'mdx', 'markdown', 'rst', 'txt',
    // Other languages
    'swift', 'r', 'rmd', 'sql', 'lua', 'dart', 'coffee', 'litcoffee',
    // Common config files
    'env', 'gitignore', 'npmrc', 'babelrc', 'eslintrc', 'prettierrc'
  ].includes(extension || '') || fileName.includes('.');
};

export const getLanguageFromFileName = (fileName: string): string => {
  // Handle special filenames
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName === 'dockerfile' || lowerFileName.startsWith('dockerfile.')) {
    return 'dockerfile';
  }
  if (lowerFileName === 'makefile' || lowerFileName === 'gnumakefile') {
    return 'makefile';
  }
  if (lowerFileName === '.gitignore' || lowerFileName === '.gitattributes') {
    return 'plaintext';
  }
  if (lowerFileName.startsWith('.env')) {
    return 'dotenv';
  }
  
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    // JavaScript/TypeScript
    case 'js':
    case 'mjs':
    case 'cjs': return 'javascript';
    case 'jsx': return 'javascript';
    case 'ts':
    case 'mts':
    case 'cts': return 'typescript';
    case 'tsx': return 'typescript';
    
    // Python
    case 'py':
    case 'pyw':
    case 'pyi': return 'python';
    
    // Java/Kotlin/Scala
    case 'java': return 'java';
    case 'kt':
    case 'kts': return 'kotlin';
    case 'scala':
    case 'sc': return 'scala';
    
    // C/C++/C#
    case 'c': return 'c';
    case 'h': return 'cpp';  // Headers usually contain C++ code
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
    case 'hh':
    case 'hxx': return 'cpp';
    case 'cs':
    case 'csx': return 'csharp';
    
    // Go/Rust
    case 'go':
    case 'mod':
    case 'sum': return 'go';
    case 'rs': return 'rust';
    
    // Ruby/PHP/Perl
    case 'rb':
    case 'rake':
    case 'gemspec': return 'ruby';
    case 'php':
    case 'phtml': return 'php';
    case 'pl':
    case 'pm': return 'perl';
    
    // Web Technologies
    case 'html':
    case 'htm':
    case 'xhtml': return 'html';
    case 'css': return 'css';
    case 'scss':
    case 'sass': return 'scss';
    case 'less': return 'less';
    case 'vue': return 'vue';
    case 'svelte': return 'svelte';
    
    // Data/Config
    case 'json':
    case 'jsonc':
    case 'json5': return 'json';
    case 'xml':
    case 'xsl':
    case 'xslt': return 'xml';
    case 'yaml':
    case 'yml': return 'yaml';
    case 'toml': return 'toml';
    case 'ini':
    case 'cfg':
    case 'conf':
    case 'config': return 'ini';
    
    // Shell/Scripts
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish': return 'shell';
    case 'bat':
    case 'cmd': return 'bat';
    case 'ps1': return 'powershell';
    
    // Documentation
    case 'md':
    case 'mdx':
    case 'markdown': return 'markdown';
    case 'rst': return 'restructuredtext';
    case 'txt': return 'plaintext';
    
    // Other Languages
    case 'swift': return 'swift';
    case 'r':
    case 'rmd': return 'r';
    case 'sql': return 'sql';
    case 'lua': return 'lua';
    case 'dart': return 'dart';
    case 'coffee':
    case 'litcoffee': return 'coffeescript';
    
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
  highlightedFileId?: string | null;
  // When set, the corresponding folder should auto-expand
  expandFolderId?: string | null;
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
  onDrop,
  highlightedFileId = null,
  expandFolderId = null
}) => {
  // Change isExpanded default to false
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-expand when creating inside this folder
  useEffect(() => {
    if (!expandFolderId) return;
    const thisPath = getPathFromId(node.id);
    if (node.type === 'folder' && (node.id === expandFolderId || thisPath === expandFolderId)) {
      setIsExpanded(true);
    }
  }, [expandFolderId, node.id, node.type]);

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
          flex items-center gap-1 px-2 pr-16 h-6 cursor-pointer rounded group relative
          transition-colors duration-150 my-1.5
          ${selectedFileId === node.id
            ? 'bg-medium-coffee text-light-cream font-semibold border-l-4 border-orange-400'
            : 'hover:bg-cream-beige text-deep-espresso'}
          ${isDragOver ? 'bg-medium-coffee/20 border-2 border-medium-coffee border-dashed' : ''}
          ${highlightedFileId === node.id ? 'animate-pulse bg-green-100 border-l-4 border-green-400 transform scale-105' : ''}
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
            <FolderOpen className={`h-4 w-4 flex-shrink-0 ${selectedFileId === node.id ? 'text-orange-200' : 'text-orange-400'}`} />
          ) : (
            <Folder className={`h-4 w-4 flex-shrink-0 ${selectedFileId === node.id ? 'text-orange-200' : 'text-orange-400'}`} />
          )
        ) : (
          <div className={`${selectedFileId === node.id ? 'opacity-70' : ''}`}>
            {getFileIcon(node.name)}
          </div>
        )}
        
        <span 
          className="text-sm flex-shrink min-w-0 truncate font-mono"
          title={node.id}
        >
          {node.name}
          {node.id.includes('/') && (
            <span className="ml-2 text-xs text-gray-400 font-mono">
              {node.id.substring(0, node.id.lastIndexOf('/'))}
            </span>
          )}
        </span>
        
        {/* Actions: always render; reveal on hover, positioned at row end */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          {(() => {
            const isSelected = selectedFileId === node.id;
            const btnBase = isSelected
              ? 'p-1 rounded transition-all duration-200 bg-white/10 hover:bg-white/20'
              : 'p-1 rounded transition-all duration-200 hover:bg-cream-beige';
            const iconClass = isSelected ? 'h-4 w-4 text-light-cream' : 'h-4 w-4 text-deep-espresso';
            return (
              <>
                {node.type === 'folder' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFile(node.id, 'file', '');
                      }}
                      className={`${btnBase} hover:bg-deep-espresso/10 rounded-full transition-all duration-200 hover:scale-110`}
                      title="Create File in Folder"
                    >
                      <Plus className={iconClass} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFolder(node.id, 'folder', '');
                      }}
                      className={`${btnBase} hover:bg-deep-espresso/10 rounded-full transition-all duration-200 hover:scale-110`}
                      title="Create Folder in Folder"
                    >
                      <Folder className={iconClass} />
                    </button>
                  </>
                )}
                {/* Copy path button (left of trash) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const path = node.id.includes(':') ? node.id.split(':')[0] : node.id;
                    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                      navigator.clipboard.writeText(path).catch(() => {
                        // Fallback for clipboard errors
                        const ta = document.createElement('textarea');
                        ta.value = path;
                        document.body.appendChild(ta);
                        ta.select();
                        try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
                      });
                    }
                  }}
                  className={`${btnBase} hover:bg-deep-espresso/10 rounded-full transition-all duration-200 hover:scale-110`}
                  title="Copy Path"
                >
                  <Copy className={iconClass} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(node.id);
                  }}
                  className={`${btnBase} hover:bg-red-500/10 rounded-full transition-all duration-200 hover:scale-110`}
                  title="Delete"
                >
                  <Trash2 className={iconClass} />
                </button>
              </>
            );
          })()}
        </div>
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
              highlightedFileId={highlightedFileId}
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

// Helper: Get real path from an id (folder ids may include a prefix before ':')
function getPathFromId(id: string): string {
  if (!id) return id;
  const lastColon = id.lastIndexOf(':');
  return lastColon >= 0 ? id.substring(lastColon + 1) : id;
}

// Helper: Build path from parentId and name
function buildPathFromId(parentId: string | null, name: string): string {
  // Normalize folder ids like "full/file/path:folder/path" to just the folder path
  const parentPath = parentId ? getPathFromId(parentId) : null;
  if (!parentPath || parentPath === '.' || parentPath === '/') return name;
  return parentPath + '/' + name;
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
  highlightedFileId = null,
}: FileExplorerProps) {
  const [error, setError] = useState<string | null>(null);
  // Preserve horizontal scroll when selecting files
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollLeftRef = useRef(0);

  // UI: Create file/folder dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [draggedFileId, setDraggedFileId] = useState<string | undefined>(undefined);
  
  // Optimistic creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Track which folder should auto-expand (normalized path id)
  const [expandFolderId, setExpandFolderId] = useState<string | null>(null);

  const handleFileSelect = (file: FileNode) => {
    // Save horizontal scroll before selection triggers rerender
    if (scrollContainerRef.current) {
      lastScrollLeftRef.current = scrollContainerRef.current.scrollLeft;
    }
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // Restore horizontal scroll position after selectedFileId changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = lastScrollLeftRef.current;
    }
  }, [selectedFileId]);

  const handleRefresh = () => {
    if (onRefresh) {
      // When user clicks refresh button, bypass debounce with force refresh
      onRefresh();
    }
  };

  // Check for obvious file state inconsistencies
  const checkForInconsistencies = () => {
    // This is a simple heuristic - in a real app you might want more sophisticated checks
    return false; // For now, just return false to avoid false positives
  };

  // UI: Create file/folder dialog
  const handleShowCreate = (parentId: string | null, type: 'file' | 'folder' = 'file') => {
    setCreateParentId(parentId);
    setCreateType(type);
    setShowCreateDialog(true);
    setNewName('');
    // Auto-expand the parent folder (normalize id)
    setExpandFolderId(parentId ? getPathFromId(parentId) : null);
  };
  
  const handleCreateConfirm = async () => {
    if (!newName.trim()) return;
    if (createType === 'file' && !newName.trim().includes('.')) {
      alert('Please provide a valid file extension!');
      return;
    }
    
    // Set optimistic state
    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(false);
    
    // Fire and forget: let parent perform optimistic update immediately
    const creationPromise = Promise.resolve(
      onFileCreate(createParentId, createType, newName.trim())
    );

    // If creating within a folder (parent specified), close instantly for zero perceived delay
    if (createParentId) {
      setShowCreateDialog(false);
      setNewName('');
      setIsCreating(false);
      setCreateSuccess(false);
      // Clear expand marker after creation UX completes
      setExpandFolderId(null);
    } else {
      // For root creations via header, show a brief spinner then success
      const SPINNER_MS = 450;
      const TOTAL_MS = 900;
      setTimeout(() => {
        // Transition from spinner to success check
        setIsCreating(false);
        setCreateSuccess(true);
      }, SPINNER_MS);

      setTimeout(() => {
        setShowCreateDialog(false);
        setNewName('');
        setIsCreating(false);
        setCreateSuccess(false);
        // Clear expand marker after creation UX completes
        setExpandFolderId(null);
      }, TOTAL_MS);
    }

    // Handle async errors non-blockingly (parent will also revert optimistically)
    creationPromise.catch((error: any) => {
      const msg = error instanceof Error ? error.message : 'Failed to create';
      setError(msg);
      // Clear banner after a moment
      setTimeout(() => setError(null), 4000);
    });
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
        highlightedFileId={highlightedFileId}
        expandFolderId={expandFolderId}
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
        <div className="flex gap-0.5">
          <button
            onClick={() => handleShowCreate(null, 'file')}
            className="p-1 hover:bg-deep-espresso/10 rounded-full transition-all duration-200 hover:scale-110"
            title="Create File"
          >
            <Plus className="h-4 w-4 text-deep-espresso" />
          </button>
          <button
            onClick={() => handleShowCreate(null, 'folder')}
            className="p-1 hover:bg-deep-espresso/10 rounded-full transition-all duration-200 hover:scale-110"
            title="Create Folder"
          >
            <Folder className="h-4 w-4 text-deep-espresso" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-deep-espresso/10 rounded-full transition-all duration-200 hover:scale-110"
            title="Smart Refresh File List"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 text-deep-espresso ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* NProgress-style loading bar */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-cream-beige overflow-hidden z-50">
          <div className="h-full bg-medium-coffee animate-progress-bar" />
        </div>
      )}

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
      
      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-100 border border-red-300 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {/* File Tree */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-auto min-h-0 pt-1">
        <div className="min-w-max">
          {isLoading ? (
            // Inline skeleton loaders instead of blocking modal
            <div className="px-2 space-y-1">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 animate-pulse"
                  style={{ paddingLeft: `${Math.random() > 0.5 ? 24 : 8}px` }}
                >
                  <div className="h-5 w-5 bg-cream-beige rounded" />
                  <div className="h-4 bg-cream-beige rounded flex-1" style={{ width: `${60 + Math.random() * 40}%` }} />
                </div>
              ))}
            </div>
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
            {createError && (
              <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                {createError}
              </div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <button 
                onClick={() => setShowCreateDialog(false)} 
                className="px-4 py-1.5 rounded bg-cream-beige hover:bg-white text-deep-espresso font-medium"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateConfirm} 
                disabled={isCreating || !newName.trim()}
                className={`px-4 py-1.5 rounded font-semibold shadow flex items-center gap-2 ${
                  createSuccess 
                    ? 'bg-medium-coffee text-white' 
                    : isCreating 
                    ? 'bg-medium-coffee text-white cursor-not-allowed' 
                    : 'bg-medium-coffee hover:bg-opacity-80 text-white'
                }`}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : createSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Created!
                  </>
                ) : (
                  'Create'
                )}
              </button>
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
