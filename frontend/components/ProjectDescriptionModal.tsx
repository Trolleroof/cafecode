import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ProjectDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string) => void;
}

export default function ProjectDescriptionModal({ isOpen, onClose, onSubmit }: ProjectDescriptionModalProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      setIsLoading(true);
      
      // Call the onSubmit function and wait for it to complete
      await onSubmit(description.trim());
      
      setIsLoading(false);
      setIsLoaded(true);
    }
  };

  const handleClose = () => {
    // Reset states when closing
    setDescription('');
    setIsLoading(false);
    setIsLoaded(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>

        {isLoading ? (
          // Loading state
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-black">Loading in Progress</h2>
              <p className="text-gray-600">Setting up your project, please wait...</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
          </div>
        ) : isLoaded ? (
          // Success state
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-black">Project Loaded</h2>
              <p className="text-gray-600">Your project has been successfully loaded and is ready to go!</p>
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
            >
              Continue
            </button>
          </div>
        ) : (
          // Form state
          <>
            <h2 className="text-2xl font-bold mb-4 text-black">Start Guided Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Describe your project
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-800"
                  placeholder="e.g., Create a simple calculator that can perform basic arithmetic operations"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md mr-2"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isLoading}
                >
                  Begin
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}