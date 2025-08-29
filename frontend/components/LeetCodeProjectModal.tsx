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
  isProblemsLoading?: boolean;
}

export default function LeetCodeProjectModal({ isOpen, onClose, onSubmit, isStartingProject = false, problems, isProblemsLoading = false }: LeetCodeProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClose = () => {
    setIsLoading(false);
    setProgress(0);
    onClose();
  };

  const loading = isLoading || isStartingProject;

  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 99) {
            clearInterval(interval);
            return 99;
          }
          // Use smaller increments for smoother progression
          const increment = prev < 50 ? 1.5 : prev < 80 ? 1 : 0.8;
          return Math.min(prev + increment, 99);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false);
      setProgress(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (isProblemsLoading && problems.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center bg-black bg-opacity-60 justify-center z-50">
        <div className="rounded-3xl shadow-coffee w-full max-w-3xl relative border border-medium-coffee bg-light-cream p-7 min-w-[320px] flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-medium-coffee">
            <Loader2 className="animate-spin h-7 w-7 text-light-cream" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-medium-coffee">Loading LeetCode Problems...</h2>
          <p className="text-deep-espresso mb-6">Fetching problems from LeetCode. Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center bg-black bg-opacity-60 justify-center z-50">
      <div
        className="rounded-3xl shadow-coffee w-full max-w-3xl relative border border-medium-coffee bg-light-cream p-7 min-w-[320px]"
      >
        {!loading && (
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
              <p className="text-deep-espresso mb-6">Loading problem and generating guided steps...</p>
              <div className="w-full rounded-full h-3 bg-light-cream mb-2">
                <div className="h-3 rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-medium-coffee to-deep-espresso shadow-md" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="pt-4 pb-4 text-sm text-medium-coffee">{progress}%</div>
              <button
                type="button"
                onClick={handleClose}
                className="bg-medium-coffee text-light-cream px-4 py-2 text-sm font-medium rounded-md border border-medium-coffee hover:bg-deep-espresso hover:text-cream-beige transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-3 text-deep-espresso tracking-tight">Start LeetCode Project</h2>
            <p className="mb-4 text-medium-coffee text-base">Select a problem to get started</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto mb-8">
              {problems.map((p) => (
                <div key={p.titleSlug} className="rounded-xl border border-medium-coffee bg-medium-coffee p-3 flex flex-col shadow hover:shadow-lg transition-all duration-200 min-h-[120px]">
                  <div className="font-bold text-base text-light-cream mb-2 leading-snug" style={{wordBreak: 'break-word'}}>{p.title}</div>
                  <div className={`text-xs font-bold mb-3 ${p.difficulty === 'Easy' ? 'text-green-300' : p.difficulty === 'Medium' ? 'text-yellow-200' : 'text-red-300'}`}>{p.difficulty}</div>
                  <button
                    className="mt-auto px-0 py-0"
                    style={{borderRadius: '0.75rem', overflow: 'hidden'}}
                    onClick={() => {
                      setIsLoading(true);
                      onSubmit(p);
                      setIsLoading(false);
                    }}
                    disabled={loading}
                  >
                    <span className="block w-full bg-cream-beige text-medium-coffee text-base font-semibold py-2 px-4 shadow-coffee border border-medium-coffee hover:bg-light-cream hover:text-deep-espresso transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">Select</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-cream-beige pt-6 mt-6 flex justify-end sm:justify-end items-center w-full">
              <button
                type="button"
                onClick={handleClose}
                className="bg-medium-coffee text-light-cream px-4 py-2 text-sm font-medium rounded-md border border-medium-coffee hover:bg-deep-espresso hover:text-cream-beige transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 