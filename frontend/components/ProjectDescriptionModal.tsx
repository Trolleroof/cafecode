import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

// Color palette as CSS variables
const COLORS = {
  indigoDye: '#094074',
  lapisLazuli: '#3c6997',
  vividSkyBlue: '#5adbff',
  mustard: '#ffdd4a',
  princetonOrange: '#ff960d',
};

interface ProjectDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (description: string) => void;
  isStartingProject?: boolean;
}

export default function ProjectDescriptionModal({ isOpen, onClose, onSubmit, isStartingProject = false }: ProjectDescriptionModalProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      setIsLoading(true);
      await onSubmit(description.trim());
      setIsLoading(false);
      setIsLoaded(true);
    }
  };

  const handleClose = () => {
    setDescription('');
    setIsLoading(false);
    setIsLoaded(false);
    onClose();
  };

  const loading = isLoading || isStartingProject;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div
        className="rounded-xl shadow-xl w-full max-w-md relative border"
        style={{
          background: COLORS.indigoDye,
          borderColor: COLORS.lapisLazuli,
          padding: '1.5rem 1.25rem',
          minWidth: 280,
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-gray-300 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {loading ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: COLORS.lapisLazuli }}
              >
                <svg className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24" style={{ color: COLORS.vividSkyBlue }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.vividSkyBlue }}>Loading in Progress</h2>
              <p className="text-gray-200">Setting up your project, please wait...</p>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: COLORS.lapisLazuli }}>
              <div className="h-2 rounded-full animate-pulse" style={{ width: '60%', background: COLORS.vividSkyBlue }}></div>
            </div>
          </div>
        ) : isLoaded ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: COLORS.mustard }}
              >
                <svg className="w-7 h-7" fill="none" stroke={COLORS.princetonOrange} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.mustard }}>Project Loaded</h2>
              <p className="text-gray-200">Your project has been successfully loaded and is ready to go!</p>
            </div>
            <button
              onClick={handleClose}
              className="px-5 py-2 text-sm font-medium rounded-md shadow-md transition-colors"
              style={{ background: COLORS.princetonOrange, color: COLORS.indigoDye }}
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-3" style={{ color: COLORS.vividSkyBlue, letterSpacing: '-1px' }}>Start Guided Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="description" className="block text-base font-medium mb-2" style={{ color: COLORS.mustard }}>
                  Describe your project
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-28 px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-100 placeholder-gray-400"
                  style={{
                    background: '#0e223a',
                    border: `1px solid ${COLORS.lapisLazuli}`,
                    color: 'white',
                    fontSize: '1.1rem',
                    marginTop: 4,
                  }}
                  placeholder="e.g., Create a simple calculator that can perform basic arithmetic operations"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium rounded-md border transition-colors"
                  style={{
                    background: 'rgba(60, 105, 151, 0.85)',
                    color: 'white',
                    borderColor: COLORS.lapisLazuli,
                    borderWidth: 1,
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = COLORS.lapisLazuli)}
                  onMouseOut={e => (e.currentTarget.style.background = 'rgba(60, 105, 151, 0.85)')}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold rounded-md shadow-md flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: COLORS.princetonOrange, color: COLORS.indigoDye }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
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