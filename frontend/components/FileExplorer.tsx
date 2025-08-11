'use client';

import React, { useState, useMemo } from 'react';
import { File, Folder, FolderOpen, Plus, X, FileText, Code, Globe, Search, Menu, GripVertical } from 'lucide-react';

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
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (parentId: string | null, type: 'file' | 'folder', name: string) => void;
  onFileDelete: (fileId: string) => void;
  onFileMove?: (fileId: string, newParentId: string | null) => void;
  selectedFileId: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  stepProgression?: React.ReactNode;
}

type SearchFilter = 'all' | 'name';

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'html':
      return <Globe className="h-4 w-4 text-medium-coffee flex-shrink-0" />;
    case 'css':
      return <FileText className="h-4 w-4 text-deep-espresso flex-shrink-0" />;
    case 'js':
      return <Code className="h-4 w-4 text-medium-coffee flex-shrink-0" />;
    case 'py':
      return <Code className="h-4 w-4 text-medium-coffee flex-shrink-0" />;
    default:
      return <File className="h-4 w-4 text-deep-espresso flex-shrink-0" />;
  }
};

// Helper function to validate file extensions
const isValidFileExtension = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return ['py', 'css', 'html', 'js'].includes(extension || '');
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
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-cream-beige rounded group relative ${
          selectedFileId === node.id ? 'bg-medium-coffee text-light-cream' : 'text-deep-espresso'
        } ${
          isDragOver ? 'bg-medium-coffee/20 border-2 border-medium-coffee border-dashed' : ''
        }`}
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
            <FolderOpen className="h-4 w-4 text-medium-coffee flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-medium-coffee flex-shrink-0" />
          )
        ) : (
          getFileIcon(node.name)
        )}
        <span 
          className="text-sm flex-1 min-w-0 truncate"
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
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              searchTerm={searchTerm}
              searchFilter={searchFilter}
              maxDepth={maxDepth}
              draggedFileId={draggedFileId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function FileList({ files, render }: { files: FileNode[]; render: (file: FileNode) => React.ReactNode }) {
  // Simple windowed rendering for performance when many files
  const WINDOW = 200;
  const [start, setStart] = useState(0);
  const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const el = e.currentTarget;
    const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    const newStart = Math.floor(ratio * Math.max(0, files.length - WINDOW));
    setStart(newStart);
  };
  const slice = files.slice(start, start + WINDOW);
  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 pt-4" onScroll={onScroll}>
      <div className="min-w-max">
        {slice.map(render)}
      </div>
    </div>
  );
}

export default function FileExplorer({
  files,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileMove,
  selectedFileId,
  isCollapsed = false,
  onToggleCollapse,
  stepProgression,
}: FileExplorerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [draggedFileId, setDraggedFileId] = useState<string | undefined>(undefined);

  const handleCreate = () => {
    if (newName.trim()) {
      // Validate file extension for files
      if (createType === 'file' && !isValidFileExtension(newName.trim())) {
        alert('Only .py (Python), .css (CSS), and .html (HTML) files are allowed!');
        return;
      }
      
      onFileCreate(createParentId, createType, newName.trim());
      setShowCreateDialog(false);
      setNewName('');
    }
  };

  const handleCreateFile = (parentId: string | null) => {
    setCreateType('file');
    setCreateParentId(parentId);
    setShowCreateDialog(true);
  };

  const handleCreateFolder = (parentId: string | null) => {
    setCreateType('folder');
    setCreateParentId(parentId);
    setShowCreateDialog(true);
  };

  const handleDragStart = (fileId: string) => {
    setDraggedFileId(fileId);
  };

  const handleDragEnd = () => {
    setDraggedFileId(undefined);
  };

  const handleDrop = (targetFileId: string) => {
    if (draggedFileId && onFileMove) {
      onFileMove(draggedFileId, targetFileId);
      setDraggedFileId(undefined);
    }
  };

  if (isCollapsed) {
    return (
      <div className="h-full bg-light-cream border-r border-cream-beige flex flex-col w-12">
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
          <div className="text-center">
            <div className="w-1 h-1 bg-deep-espresso rounded-full mx-auto mb-1"></div>
            <div className="w-1 h-1 bg-deep-espresso rounded-full mx-auto mb-1"></div>
            <div className="w-1 h-1 bg-deep-espresso rounded-full mx-auto"></div>
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
            onClick={() => handleCreateFile(null)}
            className="p-1 hover:bg-cream-beige rounded"
            title="New File"
          >
            <Plus className="h-4 w-4 text-deep-espresso" />
          </button>
          <button
            onClick={() => handleCreateFolder(null)}
            className="p-1 hover:bg-cream-beige rounded"
            title="New Folder"
          >
            <Folder className="h-4 w-4 text-deep-espresso" />
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
      </div>
      
      {/* File Tree */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-center p-4">
          <File className="h-8 w-8 text-deep-espresso/50 mb-2" />
          <p className="text-deep-espresso/70 text-sm">No files yet</p>
          <p className="text-deep-espresso/50 text-xs mt-1">Create your first file to get started</p>
        </div>
      ) : (
        <FileList
          files={files}
          render={(file) => (
            <FileTreeNode
              key={file.id}
              node={file}
              level={0}
              onSelect={onFileSelect}
              onDelete={onFileDelete}
              onMove={onFileMove}
              selectedFileId={selectedFileId}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              searchTerm={searchTerm}
              searchFilter={searchFilter}
              draggedFileId={draggedFileId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          )}
        />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-cream p-4 rounded-lg border border-medium-coffee min-w-[300px]">
            <h2 className="text-deep-espresso mb-2 font-semibold">
              Create New {createType === 'file' ? 'File' : 'Folder'}
            </h2>
            {createType === 'file' && (
              <p className="text-deep-espresso/70 text-xs mb-4">
                Allowed extensions: .py, .css, .html, .js
              </p>
            )}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={createType === 'file' ? 'filename.html' : 'folder-name'}
              className="w-full px-3 py-2 bg-cream-beige text-dark-charcoal rounded mb-3 focus:outline-none focus:ring-2 focus:ring-medium-coffee"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-3 py-1 bg-medium-coffee text-light-cream rounded hover:bg-deep-espresso font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-3 py-1 bg-cream-beige text-deep-espresso rounded hover:bg-deep-espresso hover:text-light-cream"
              >
                Cancel
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