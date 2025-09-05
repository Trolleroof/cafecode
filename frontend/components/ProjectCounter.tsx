'use client';

import React, { useState, useEffect } from 'react';
import { IconCode, IconStar, IconLock, IconRefresh, IconBolt, IconTrendingUp, IconRocket } from '@tabler/icons-react';

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

  // Use 3-project free limit
  const FREE_LIMIT = 3;
  const isNearLimit = projectCount >= FREE_LIMIT - 1 && !hasUnlimitedAccess;
  const isAtLimit = projectCount >= FREE_LIMIT && !hasUnlimitedAccess;

  const TopStatusCard = (
    <div className="rounded-3xl px-6 py-5 bg-white/95 backdrop-blur-xl shadow-sm border border-gray-100/50 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-lg font-semibold text-dark-charcoal tracking-tight mb-1">
            {hasUnlimitedAccess ? 'Unlimited Access' : 'Free Plan'}
          </div>
          <div className="text-sm text-gray-600 font-light">
            {hasUnlimitedAccess 
              ? 'Create unlimited projects' 
              : `${projectCount}/${FREE_LIMIT} projects used`
            }
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh project status"
              title={refreshError ? `Error: ${refreshError}` : 'Refresh status'}
            >
              <IconRefresh className={`h-4 w-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''} ${refreshError ? 'text-red-500' : ''}`} />
            </button>
          )}
          {!hasUnlimitedAccess && (
            <button
              onClick={onUpgradeClick}
              className="px-4 py-2 bg-dark-charcoal text-white rounded-2xl text-sm font-medium hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300/50"
              aria-label="Upgrade to unlimited projects"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const LimitCard = (
    <div className={`backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border transition-all duration-300 hover:shadow-xl ${
      isAtLimit 
        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200/50 hover:border-red-300/50' 
        : 'bg-white/95 border-medium-coffee/30'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isAtLimit ? 'bg-gradient-to-br from-red-400 to-orange-500' : 'bg-gradient-to-br from-medium-coffee to-deep-espresso'}`}>
            <IconCode className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-dark-charcoal font-bold text-sm">
                {Math.min(projectCount, FREE_LIMIT)}/{FREE_LIMIT} Free Projects
              </span>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="p-1 hover:bg-medium-coffee/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh project count"
                  title={refreshError ? `Error: ${refreshError}` : "Refresh project count"}
                >
                  <IconRefresh className={`h-3 w-3 text-medium-coffee ${isRefreshing ? 'animate-spin' : ''} ${refreshError ? 'text-red-500' : ''}`} />
                </button>
              )}
            </div>
            {isAtLimit ? (
              <span className="text-red-600 text-xs font-medium flex items-center gap-1">
                <IconLock className="h-3 w-3" />
                You've used your free projects!
              </span>
            ) : (
              <span className="text-medium-coffee text-xs">{FREE_LIMIT - projectCount} free {FREE_LIMIT - projectCount === 1 ? 'project' : 'projects'} remaining</span>
            )}
          </div>
        </div>
        
        {isAtLimit && (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-orange-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Upgrade to unlimited projects"
          >
            <IconBolt className="h-4 w-4" />
            <span className="font-semibold text-sm">Upgrade Now</span>
          </button>
        )}
      </div>
      
      {/* Progress bar and messaging */}
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              projectCount >= FREE_LIMIT 
                ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                : 'bg-gradient-to-r from-medium-coffee to-deep-espresso'
            }`}
            style={{ width: `${Math.min((projectCount / FREE_LIMIT) * 100, 100)}%` }}
            aria-label={`Project progress: ${projectCount} out of ${FREE_LIMIT} free projects used`}
          />
        </div>
        
        {isAtLimit ? (
          <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-red-100 rounded-full">
                <IconTrendingUp className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-red-800 font-semibold text-sm mb-1">Ready to level up your coding?</h4>
                <p className="text-red-700 text-xs mb-2">
                  You've completed your free projects! Unlock unlimited guided projects, advanced features, and faster builds for just <strong>$4.99</strong>.
                </p>
                <div className="flex items-center gap-1 text-red-600 text-xs font-medium">
                  <IconRocket className="h-3 w-3" />
                  <span>Join 1,000+ developers building faster</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-center">
            <p className="text-medium-coffee text-xs">
              Build your free projects, then upgrade for unlimited access
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const TotalProjectsCard = (
    <div className="mt-3 rounded-3xl px-6 py-5 bg-white/95 backdrop-blur-xl shadow-sm border border-gray-100/50">
      <div className="text-center">
        <div className="text-4xl font-bold text-dark-charcoal mb-1 tracking-tight">
          {projectCount}
        </div>
        <div className="text-sm font-medium text-gray-600 tracking-wide uppercase">
          {projectCount === 1 ? 'Project Created' : 'Projects Created'}
        </div>
       
      </div>
    </div>
  );

  
  // For paid users, only show the status card
  if (hasUnlimitedAccess) {
    return TopStatusCard;
  }

  // For free users, show the full counter
  return (
    <div>
      {TopStatusCard}
      <div className="mt-3">{LimitCard}</div>
      {TotalProjectsCard}
    </div>
  );
}
