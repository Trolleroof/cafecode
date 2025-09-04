'use client';

import React, { useState, useEffect } from 'react';
import { IconCode, IconStar, IconLock, IconRefresh } from '@tabler/icons-react';

interface ProjectCounterProps {
  projectCount: number;
  hasUnlimitedAccess: boolean;
  onUpgradeClick: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshError?: string | null;
}

export default function ProjectCounter({ projectCount, hasUnlimitedAccess, onUpgradeClick, onRefresh, isRefreshing = false, refreshError = null }: ProjectCounterProps) {
  // Add hydration state to prevent mismatch
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Don't render until hydrated to prevent server/client mismatch
  if (!isHydrated) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-medium-coffee/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <IconCode className="h-5 w-5 text-medium-coffee" />
            <span className="text-dark-charcoal font-semibold">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Updated to use 1 free project limit instead of 3
  const isNearLimit = projectCount >= 1 && !hasUnlimitedAccess;
  const isAtLimit = projectCount >= 1 && !hasUnlimitedAccess;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-medium-coffee/30 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <IconCode className="h-5 w-5 text-medium-coffee" />
          <span className="text-dark-charcoal font-semibold">
            {hasUnlimitedAccess ? (
              <span className="flex items-center gap-1">
                ∞ Projects
                <IconStar className="h-4 w-4 text-yellow-500" />
              </span>
            ) : (
              `${projectCount}/1 Project`
            )}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="ml-2 p-1 hover:bg-medium-coffee/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh project count"
              title={refreshError ? `Error: ${refreshError}` : "Refresh project count"}
            >
              <IconRefresh className={`h-4 w-4 text-medium-coffee ${isRefreshing ? 'animate-spin' : ''} ${refreshError ? 'text-red-500' : ''}`} />
            </button>
          )}
        </div>
        
        {!hasUnlimitedAccess && (
          <>
            {isNearLimit && !isAtLimit && (
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
            )}
            {isAtLimit && (
              <button
                onClick={onUpgradeClick}
                className="flex items-center gap-1 text-xs bg-medium-coffee text-white px-2 py-1 rounded-full hover:bg-deep-espresso transition-colors focus:outline-none focus:ring-2 focus:ring-medium-coffee/50"
                aria-label="Upgrade to unlimited projects"
              >
                <IconLock className="h-3 w-3" />
                Upgrade
              </button>
            )}
          </>
        )}
      </div>
      
      {!hasUnlimitedAccess && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              projectCount >= 1 
                ? 'bg-red-500' 
                : 'bg-medium-coffee'
            }`}
            style={{ width: `${Math.min((projectCount / 1) * 100, 100)}%` }}
            aria-label={`Project progress: ${projectCount} out of 1 free project used`}
          />
        </div>
      )}
    </div>
  );
}
