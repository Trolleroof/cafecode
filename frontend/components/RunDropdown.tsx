'use client';

import React, { useState } from 'react';
import { Play, ChevronDown, File, Globe } from 'lucide-react';
import { FileNode } from '@/types';

interface RunDropdownProps {
  files: FileNode[];
  onRunFile: (file: FileNode) => void;
  isRunning: boolean;
}

const getExecutableFiles = (files: FileNode[]): FileNode[] => {
  const executable: FileNode[] = [];
  
  const traverse = (nodes: FileNode[]) => {
    nodes.forEach(node => {
      if (node.type === 'file') {
        const extension = node.name.split('.').pop()?.toLowerCase();
        if (['html', 'js', 'py'].includes(extension || '')) {
          executable.push(node);
        }
      } else if (node.children) {
        traverse(node.children);
      }
    });
  };
  
  traverse(files);
  return executable;
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'html':
      return <Globe className="h-4 w-4 text-orange-500" />;
    case 'js':
      return <File className="h-4 w-4 text-yellow-500" />;
    case 'py':
      return <File className="h-4 w-4 text-green-500" />;
    default:
      return <File className="h-4 w-4 text-gray-400" />;
  }
};

export default function RunDropdown({ files, onRunFile, isRunning }: RunDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const executableFiles = getExecutableFiles(files);

  if (executableFiles.length === 0) {
    return (
      <button
        disabled
        className="flex items-center px-4 py-2 bg-gray-600 text-gray-400 rounded-md cursor-not-allowed"
      >
        <Play className="mr-2 h-4 w-4" />
        No Runnable Files
      </button>
    );
  }

  if (executableFiles.length === 1) {
    return (
      <button
        onClick={() => onRunFile(executableFiles[0])}
        disabled={isRunning}
        className="flex items-center px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
      >
        <Play className="mr-2 h-4 w-4" />
        Run {executableFiles[0].name}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isRunning}
        className="flex items-center px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
      >
        <Play className="mr-2 h-4 w-4" />
        Run
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-10 overflow-hidden">
          <div className="py-1">
            {executableFiles.map((file, index) => (
              <button
                key={file.id}
                onClick={() => {
                  onRunFile(file);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2.5 text-left text-gray-200 hover:bg-gray-700 transition-colors duration-150 ${
                  index === 0 ? 'rounded-t-md' : ''
                } ${
                  index === executableFiles.length - 1 ? 'rounded-b-md' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.name)}
                </div>
                <span className="ml-3 text-sm font-medium truncate">{file.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}