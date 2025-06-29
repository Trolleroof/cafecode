import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

const COLORS = {
  indigoDye: '#094074',
  lapisLazuli: '#3c6997',
  vividSkyBlue: '#5adbff',
  mustard: '#ffdd4a',
  princetonOrange: '#ff960d',
};

interface Problem {
  title: string;
  titleSlug: string;
  difficulty: string;
}

interface LeetCodeProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (problem: Problem) => void;
  isStartingProject?: boolean;
  problems: Problem[];
}

export default function LeetCodeProjectModal({ isOpen, onClose, onSubmit, isStartingProject = false, problems }: LeetCodeProjectModalProps) {
  const [selectedSlug, setSelectedSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [problemsLoaded, setProblemsLoaded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlug) {
      setIsLoading(true);
      const problem = problems.find(p => p.titleSlug === selectedSlug);
      if (problem) await onSubmit(problem);
      setIsLoading(false);
      setIsLoaded(true);
    }
  };

  const handleClose = () => {
    setSelectedSlug('');
    setIsLoading(false);
    setIsLoaded(false);
    setProgress(0);
    onClose();
  };

  const loading = isLoading || isStartingProject;

  useEffect(() => {
    if (loading && !isLoaded) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 99) {
            clearInterval(interval);
            return 99;
          }
          const increment = prev < 50 ? 8 : prev < 80 ? 4 : 2;
          return Math.min(prev + increment, 99);
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [loading, isLoaded]);

  if (!isOpen) return null;

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
        {!loading && !isLoaded && (
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 text-gray-300 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: COLORS.lapisLazuli }}
              >
                <Loader2 className="animate-spin h-7 w-7" style={{ color: COLORS.vividSkyBlue }} />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.vividSkyBlue }}>Setting Up Your LeetCode Project</h2>
              <p className="text-gray-200">Loading problem and generating guided steps...</p>
            </div>
            <div className="w-full rounded-full h-3" style={{ background: COLORS.lapisLazuli }}>
              <div 
                className="h-3 rounded-full transition-all duration-300 ease-out" 
                style={{ 
                  width: `${progress}%`, 
                  background: `linear-gradient(90deg, ${COLORS.vividSkyBlue} 0%, ${COLORS.mustard} 100%)`,
                  boxShadow: `0 0 10px ${COLORS.vividSkyBlue}40`
                }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-gray-300">{progress}%</div>
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
              <h2 className="text-xl font-semibold mb-2" style={{ color: COLORS.mustard }}>Project Ready!</h2>
              <p className="text-gray-200">Your LeetCode guided project is ready. Let's start coding!</p>
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
            <h2 className="text-2xl font-bold mb-3" style={{ color: COLORS.vividSkyBlue, letterSpacing: '-1px' }}>Start LeetCode Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="problem" className="block text-base font-medium mb-2" style={{ color: COLORS.mustard }}>
                  Select a LeetCode Problem
                </label>
                <select
                  id="problem"
                  value={selectedSlug}
                  onChange={e => setSelectedSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 text-gray-100"
                  style={{
                    background: '#0e223a',
                    border: `1px solid ${COLORS.lapisLazuli}`,
                    color: 'white',
                    fontSize: '1.1rem',
                    marginTop: 4,
                  }}
                  required
                  disabled={loading}
                >
                  <option value="" disabled>Select a problem...</option>
                  {problems.map((p) => (
                    <option key={p.titleSlug} value={p.titleSlug}>
                      {p.title} ({p.difficulty})
                    </option>
                  ))}
                </select>
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
                  disabled={loading || !selectedSlug}
                >
                  {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                  Start
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
} 