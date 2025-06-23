'use client';

import React, { useState, useMemo } from 'react';
import { File, Folder, FolderOpen, Plus, X, FileText, Code, Globe, Search, ChevronLeft, ChevronRight, MoreVertical, GripVertical, Filter, Menu } from 'lucide-react';

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
}

type SearchFilter = 'all' | 'name';

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'html':
      return <Globe className="h-4 w-4 text-orange-500 flex-shrink-0" />;
    case 'css':
      return <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    case 'js':
      return <Code className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    case 'py':
      return <Code className="h-4 w-4 text-green-500 flex-shrink-0" />;
    default:
      return <File className="h-4 w-4 text-gray-400 flex-shrink-0" />;
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
  const [isDragOverTop, setIsDragOverTop] = useState(false);
  const [isDragOverBottom, setIsDragOverBottom] = useState(false);

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
    if (onDragStart) {
      onDragStart(node.id);
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragOver(false);
    setIsDragOverTop(false);
    setIsDragOverBottom(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedFileId === node.id) return; // Can't drop on itself
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    setIsDragOver(true);
    setIsDragOverTop(y < height / 3);
    setIsDragOverBottom(y > (height * 2) / 3);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're leaving the element entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
      setIsDragOverTop(false);
      setIsDragOverBottom(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsDragOverTop(false);
    setIsDragOverBottom(false);
    
    if (draggedFileId && draggedFileId !== node.id && onDrop) {
      onDrop(node.id);
    }
  };

  const canDrop = draggedFileId && draggedFileId !== node.id;

  return (
    <div>
      {/* Top drop zone */}
      {canDrop && (
        <div
          className={`h-1 transition-colors duration-200 ${
            isDragOverTop ? 'bg-blue-500' : 'bg-transparent'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
        />
      )}
      
      <div
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-700 rounded group relative ${
          selectedFileId === node.id ? 'bg-blue-600' : ''
        } ${
          isDragOver ? 'bg-blue-800 border-2 border-blue-500' : ''
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
            <GripVertical className="h-3 w-3 text-gray-500 flex-shrink-0" />
          </div>
        )}
        
        {node.type === 'folder' ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-400 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-blue-400 flex-shrink-0" />
          )
        ) : (
          getFileIcon(node.name)
        )}
        <span 
          className="text-sm text-gray-200 flex-1 min-w-0 truncate"
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
                  className="p-1 hover:bg-gray-600 rounded"
                  title="New File"
                >
                  <Plus className="h-3 w-3 text-gray-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(node.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                  title="New Folder"
                >
                  <Folder className="h-3 w-3 text-gray-400" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              className="p-1 hover:bg-red-600 rounded"
              title="Delete"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          </div>
        )}
      </div>
      
      {/* Bottom drop zone */}
      {canDrop && (
        <div
          className={`h-1 transition-colors duration-200 ${
            isDragOverBottom ? 'bg-blue-500' : 'bg-transparent'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={handleDragLeave}
        />
      )}
      
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

export default function FileExplorer({
  files,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileMove,
  selectedFileId,
  isCollapsed = false,
  onToggleCollapse,
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
      <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col w-12">
        <div className="flex items-center justify-center p-2 border-b border-gray-700">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-gray-700 rounded transition-colors duration-200"
            title="Expand Explorer"
          >
            <Menu className="h-4 w-4 text-gray-400 hover:text-gray-200" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center space-y-2">
          <div className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors duration-200">
            <File className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-center">
            <div className="w-1 h-1 bg-gray-500 rounded-full mx-auto mb-1"></div>
            <div className="w-1 h-1 bg-gray-500 rounded-full mx-auto mb-1"></div>
            <div className="w-1 h-1 bg-gray-500 rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-700 rounded"
            title="Collapse Explorer"
          >
            <Menu className="h-4 w-4 text-gray-400" />
          </button>
          <h3 className="text-sm font-semibold text-gray-200">Explorer</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handleCreateFile(null)}
            className="p-1 hover:bg-gray-700 rounded"
            title="New File"
          >
            <Plus className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={() => handleCreateFolder(null)}
            className="p-1 hover:bg-gray-700 rounded"
            title="New Folder"
          >
            <Folder className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-gray-700 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1 bg-gray-700 text-white text-sm border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Search Filters */}
     
      
      {/* File Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 pt-2">
        <div className="min-w-max">
          {files.map((file) => (
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
          ))}
        </div>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 min-w-[300px]">
            <h4 className="text-white mb-3">
              Create New {createType === 'file' ? 'File' : 'Folder'}
            </h4>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={createType === 'file' ? 'filename.html' : 'folder-name'}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}