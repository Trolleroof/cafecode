'use client';

import React from 'react';
import { IconCode, IconStar, IconLock } from '@tabler/icons-react';

interface ProjectCounterProps {
  projectCount: number;
  hasUnlimitedAccess: boolean;
  onUpgradeClick: () => void;
}

export default function ProjectCounter({ projectCount, hasUnlimitedAccess, onUpgradeClick }: ProjectCounterProps) {
  const isNearLimit = projectCount >= 2 && !hasUnlimitedAccess;
  const isAtLimit = projectCount >= 3 && !hasUnlimitedAccess;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-medium-coffee/20 hover:shadow-xl transition-all duration-300">
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
              `${projectCount}/3 Projects`
            )}
          </span>
        </div>
        
        {!hasUnlimitedAccess && (
          <>
            {isNearLimit && !isAtLimit && (
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
            )}
            {isAtLimit && (
              <button
                onClick={onUpgradeClick}
                className="flex items-center gap-1 text-xs bg-medium-coffee text-white px-2 py-1 rounded-full hover:bg-deep-espresso transition-colors"
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
              projectCount >= 3 
                ? 'bg-red-500' 
                : projectCount >= 2 
                ? 'bg-yellow-500' 
                : 'bg-medium-coffee'
            }`}
            style={{ width: `${Math.min((projectCount / 3) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
