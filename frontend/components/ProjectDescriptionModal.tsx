import React, { useState } from 'react';
import { X } from 'lucide-react';
import ProjectSetupLoader from './ProjectSetupLoader';

interface ProjectDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string) => void;
  isStartingProject?: boolean;
  error?: string | null;
}

export default function ProjectDescriptionModal({ isOpen, onClose, onSubmit, isStartingProject = false, error }: ProjectDescriptionModalProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && !isStartingProject) {
      onSubmit(description.trim());
    }
  };

  const handleClose = () => {
    setDescription('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div
        className="rounded-xl shadow-xl w-full max-w-md relative border bg-light-cream border-cream-beige p-6 min-w-[280px]"
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-deep-espresso hover:text-medium-coffee transition-colors disabled:opacity-50"
          disabled={isStartingProject && !error}
        >
          <X className="h-6 w-6" />
        </button>

        {isStartingProject ? (
          <div className="text-center py-8">
            <ProjectSetupLoader 
              isOpen={isStartingProject}
              title="Setting Up Your Project"
              description="Creating your guided project workspace..."
            />
            {error && (
              <button
                onClick={handleClose}
                className="mt-4 px-5 py-2 text-sm font-medium rounded-md shadow-md transition-colors bg-medium-coffee text-light-cream hover:bg-deep-espresso"
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-3 text-medium-coffee tracking-tight">Start Guided Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="description" className="block text-base font-medium mb-2 text-deep-espresso">
                  Describe your project
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-28 px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-dark-charcoal placeholder-deep-espresso bg-cream-beige border border-medium-coffee text-lg mt-1"
                  placeholder="e.g., Create a simple calculator that can perform basic arithmetic operations"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium rounded-md border bg-cream-beige text-deep-espresso border-medium-coffee hover:bg-medium-coffee hover:text-light-cream transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-md shadow-md flex items-center transition-colors bg-medium-coffee text-light-cream hover:bg-deep-espresso disabled:opacity-50 disabled:cursor-not-allowed"
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