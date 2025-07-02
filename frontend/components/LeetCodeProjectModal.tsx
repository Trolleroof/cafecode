import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 flex items-center bg-black bg-opacity-60 justify-center z-50">
      <div
        className="rounded-3xl shadow-coffee w-full max-w-md relative border border-medium-coffee bg-cream-beige p-8 min-w-[280px]"
      >
        {!loading && !isLoaded && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 text-medium-coffee hover:text-deep-espresso transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-medium-coffee">
                <Loader2 className="animate-spin h-7 w-7 text-light-cream" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-medium-coffee">Setting Up Your LeetCode Project</h2>
              <p className="text-deep-espresso">Loading problem and generating guided steps...</p>
            </div>
            <div className="w-full rounded-full h-3 bg-cream-beige">
              <div 
                className="h-3 rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-medium-coffee to-deep-espresso shadow-md"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-medium-coffee">{progress}%</div>
          </div>
        ) : isLoaded ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-light-cream animate-warm-glow">
                <svg className="w-7 h-7" fill="none" stroke="#a36a3e" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-deep-espresso">Project Ready!</h2>
              <p className="text-dark-charcoal">Your LeetCode guided project is ready. Let's start coding!</p>
            </div>
            <button
              onClick={handleClose}
              className="btn-coffee-primary px-5 py-2 text-sm font-medium rounded-md shadow-coffee transition-colors"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-3 text-deep-espresso tracking-tight">Start LeetCode Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="problem" className="block text-base font-medium mb-2 text-medium-coffee">
                  Select a problem from the dropdown
                </label>
                <select
                  id="problem"
                  value={selectedSlug}
                  onChange={e => setSelectedSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-medium-coffee text-dark-charcoal bg-light-cream border border-medium-coffee text-lg mt-1"
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
                  className="btn-coffee-secondary px-4 py-2 text-sm font-medium rounded-md border border-medium-coffee transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-coffee-primary px-4 py-2 text-sm font-semibold rounded-md shadow-coffee flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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