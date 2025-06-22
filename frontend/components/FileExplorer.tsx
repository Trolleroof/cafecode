'use client';

import React, { useState } from 'react';
import { File, Folder, FolderOpen, Plus, X, FileText, Code, Globe, FolderPlus } from 'lucide-react';

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
  onFileMove: (fileId: string, newParentId: string | null) => void;
  selectedFileId: string | null;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'html':
      return <Globe className="h-4 w-4 text-orange-500" />;
    case 'css':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'js':
      return <Code className="h-4 w-4 text-yellow-500" />;
    case 'py':
      return <Code className="h-4 w-4 text-green-500" />;
    default:
      return <File className="h-4 w-4 text-gray-400" />;
  }
};

const FileTreeNode: React.FC<{
  node: FileNode;
  level: number;
  onSelect: (file: FileNode) => void;
  onDelete: (fileId: string) => void;
  onFileMove: (fileId: string, newParentId: string | null) => void;
  selectedFileId: string | null;
  onCreateFile: (parentId: string) => void;
  onCreateFolder: (parentId: string) => void;
}> = ({ node, level, onSelect, onDelete, onFileMove, selectedFileId, onCreateFile, onCreateFolder }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showActions, setShowActions] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
    if (node.type === 'file') {
      onSelect(node);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (node.type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only remove drag over state if we're actually leaving this element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (node.type === 'folder') {
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== node.id) {
        onFileMove(draggedId, node.id);
      }
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-gray-700 rounded transition-colors ${
          selectedFileId === node.id ? 'bg-blue-600' : ''
        } ${isDragOver && node.type === 'folder' ? 'bg-green-600/30 border border-green-500' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        draggable={true}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {node.type === 'folder' ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-blue-400" />
          ) : (
            <Folder className="h-4 w-4 text-blue-400" />
          )
        ) : (
          getFileIcon(node.name)
        )}
        <span className="text-sm text-gray-200 flex-1">{node.name}</span>
        {showActions && (
          <div className="flex items-center gap-1">
            {node.type === 'folder' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFile(node.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                  title="New File"
                >
                  <Plus className="h-3 w-3 text-green-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder(node.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                  title="New Folder"
                >
                  <FolderPlus className="h-3 w-3 text-blue-400" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
                  onDelete(node.id);
                }
              }}
              className="p-1 hover:bg-red-600 rounded transition-colors"
              title="Delete"
            >
              <X className="h-3 w-3 text-red-400" />
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
              onFileMove={onFileMove}
              selectedFileId={selectedFileId}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
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
}: FileExplorerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleCreate = () => {
    if (newName.trim()) {
      // Add appropriate extension for files if not provided
      let finalName = newName.trim();
      if (createType === 'file' && !finalName.includes('.')) {
        finalName += '.js'; // Default to JavaScript file
      }
      
      onFileCreate(createParentId, createType, finalName);
      setShowCreateDialog(false);
      setNewName('');
    }
  };

  const handleCreateFile = (parentId: string | null) => {
    setCreateType('file');
    setCreateParentId(parentId);
    setNewName('');
    setShowCreateDialog(true);
  };

  const handleCreateFolder = (parentId: string | null) => {
    setCreateType('folder');
    setCreateParentId(parentId);
    setNewName('');
    setShowCreateDialog(true);
  };

  // Root drop area handlers
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    // Only remove drag over state if we're actually leaving the root area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId) {
      onFileMove(draggedId, null);
    }
  };

  const getPlaceholder = () => {
    if (createType === 'file') {
      return 'filename.html, script.js, style.css, etc.';
    } else {
      return 'folder-name';
    }
  };

  const getSuggestedNames = () => {
    if (createType === 'file') {
      return ['index.html', 'style.css', 'script.js', 'main.py', 'app.js'];
    } else {
      return ['components', 'assets', 'utils', 'styles', 'scripts'];
    }
  };

  return (
    <div className="h-full bg-gray-800 border-r border-gray-700">
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">Explorer</h3>
        <div className="flex gap-1">
          <button
            onClick={() => handleCreateFile(null)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="New File"
          >
            <Plus className="h-4 w-4 text-green-400" />
          </button>
          <button
            onClick={() => handleCreateFolder(null)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4 text-blue-400" />
          </button>
        </div>
      </div>
      
      <div 
        className={`overflow-y-auto h-full transition-colors ${
          isDragOver ? 'bg-green-600/10 border-2 border-green-500 border-dashed' : ''
        }`}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {files.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-3">No files yet</p>
            <div className="space-y-2">
              <button
                onClick={() => handleCreateFile(null)}
                className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
              >
                Create First File
              </button>
              <button
                onClick={() => handleCreateFolder(null)}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Create Folder
              </button>
            </div>
          </div>
        ) : (
          <>
            {files.map((file) => (
              <FileTreeNode
                key={file.id}
                node={file}
                level={0}
                onSelect={onFileSelect}
                onDelete={onFileDelete}
                onFileMove={onFileMove}
                selectedFileId={selectedFileId}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
              />
            ))}
            
            {isDragOver && (
              <div className="p-4 text-center text-green-400 text-sm">
                Drop here to move to root folder
              </div>
            )}
          </>
        )}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 w-96">
            <h4 className="text-white mb-4 text-lg font-semibold">
              Create New {createType === 'file' ? 'File' : 'Folder'}
            </h4>
            
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                } else if (e.key === 'Escape') {
                  setShowCreateDialog(false);
                }
              }}
              autoFocus
            />
            
            {/* Quick suggestions */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {getSuggestedNames().map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setNewName(suggestion)}
                    className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create {createType === 'file' ? 'File' : 'Folder'}
              </button>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
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