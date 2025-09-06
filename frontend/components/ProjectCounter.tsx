'use client';

import React, { useState, useEffect } from 'react';
import { IconCode, IconStar, IconLock, IconBolt, IconTrendingUp, IconRocket } from '@tabler/icons-react';

interface ProjectCounterProps {
  projectCount: number;
  hasUnlimitedAccess: boolean;
  onUpgradeClick: () => void;
}

export default function ProjectCounter({ projectCount, hasUnlimitedAccess, onUpgradeClick }: ProjectCounterProps) {
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

  // Use 3-project free limit
  const FREE_LIMIT = 3;
  const isNearLimit = projectCount >= FREE_LIMIT - 1 && !hasUnlimitedAccess;
  const isAtLimit = projectCount >= FREE_LIMIT && !hasUnlimitedAccess;
  const remaining = Math.max(FREE_LIMIT - projectCount, 0);

  const TopStatusCard = (
    <div className="rounded-3xl px-6 py-5 bg-gradient-to-br from-white to-cream-beige/20 backdrop-blur-xl shadow-lg border border-medium-coffee/20 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-lg font-semibold text-dark-charcoal tracking-tight mb-1">
            {hasUnlimitedAccess ? '🚀 Pro Developer' : '☕ Free Plan'}
          </div>
          {hasUnlimitedAccess && (
            <div className="text-sm text-medium-coffee font-medium">
              Unlimited projects • Premium features
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!hasUnlimitedAccess && (
            <button
              onClick={onUpgradeClick}
              className="px-5 py-2.5 bg-gradient-to-r from-medium-coffee to-deep-espresso text-white rounded-2xl text-sm font-semibold hover:from-deep-espresso hover:to-medium-coffee transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-medium-coffee/50 shadow-md hover:shadow-lg transform hover:scale-105"
              aria-label="Upgrade to unlimited projects"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Compact card for free users
  const CombinedFreeCard = (
    <div className={`rounded-2xl px-4 py-3 shadow-md border transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-white to-cream-beige/20 border-medium-coffee/20`}>
      {/* Header row with plan + CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <IconCode className="h-4 w-4 text-medium-coffee" />
            <span className="text-dark-charcoal font-semibold text-sm">
              {Math.min(projectCount, FREE_LIMIT)}/{FREE_LIMIT}
            </span>
            <span className="px-1.5 py-0.5 bg-medium-coffee/10 text-medium-coffee text-xs font-semibold rounded-full">
              FREE
            </span>
          </div>
        </div>
        <button
          onClick={onUpgradeClick}
          className="px-3 py-1.5 bg-gradient-to-r from-medium-coffee to-deep-espresso text-white rounded-xl text-xs font-semibold hover:from-deep-espresso hover:to-medium-coffee transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-medium-coffee/50 shadow-sm hover:shadow-md"
          aria-label="Upgrade to unlimited projects"
        >
          Upgrade to Pro
        </button>
      </div>

      {/* Sales-friendly hint under header for free users */}
      {!isAtLimit && (
        <div className="mt-1 text-[11px] sm:text-xs text-medium-coffee/90 font-medium">
          {remaining} {remaining === 1 ? 'project' : 'projects'} left on Free plan — unlock unlimited with Pro.
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 bg-gradient-to-r from-medium-coffee to-deep-espresso`}
          style={{ width: `${Math.min((projectCount / FREE_LIMIT) * 100, 100)}%` }}
          aria-label={`Project progress: ${projectCount} of ${FREE_LIMIT} used`}
        />
      </div>

      {/* Contextual helper text - only show when at limit */}
      {isAtLimit && (
        <div className="mt-2 p-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200/50">
          <div className="flex items-center gap-2">
            <IconTrendingUp className="h-3 w-3 text-orange-600" />
            <p className="text-orange-800 text-xs">
              Free limit reached. <span className="font-semibold">Upgrade for unlimited projects.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );



  
  // For paid users, show a single status card; for free users, show the combined card
  if (hasUnlimitedAccess) return TopStatusCard;
  return CombinedFreeCard;
}
