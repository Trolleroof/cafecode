import React from 'react';
import { X } from 'lucide-react';

interface FeatureDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: {
    title: string;
    description: React.ReactNode;
    demoContent?: React.ReactNode;
  } | null;
}

export default function FeatureDemoModal({ isOpen, onClose, feature }: FeatureDemoModalProps) {
  if (!isOpen || !feature) return null;

  const getDemoContent = () => {
    switch (feature.title) {
      case 'Brewster AI Assistant':
        return (
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  You
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">How do I optimize this React component?</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  AI
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">I can help you optimize that! Here are 3 key improvements:</p>
                  <ul className="mt-2 text-sm text-gray-600 space-y-1">
                    <li>• Use React.memo to prevent unnecessary re-renders</li>
                    <li>• Implement useCallback for event handlers</li>
                    <li>• Consider lazy loading for heavy components</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Smart Code Fixes':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm font-mono text-red-700">❌ const user = users.find(u =&gt; u.id = userId);</p>
              <p className="text-xs text-red-600 mt-1">Assignment in condition (should be ===)</p>
            </div>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-sm font-mono text-green-700">✅ const user = users.find(u =&gt; u.id === userId);</p>
              <p className="text-xs text-green-600 mt-1">Fixed: Using comparison operator</p>
            </div>
            <button className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
              Apply Fix
            </button>
          </div>
        );
      case 'Instant Code Runner':
        return (
          <div className="space-y-4">
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <div>$ node app.js</div>
              <div className="mt-2 text-white">Hello, World!</div>
              <div className="text-blue-400">Server running on port 3000</div>
              <div className="animate-pulse">_</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button className="py-2 px-3 bg-green-500 text-white rounded text-xs hover:bg-green-600">Run</button>
              <button className="py-2 px-3 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600">Debug</button>
              <button className="py-2 px-3 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">Share</button>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Interactive demo coming soon!</p>
            <p className="text-sm text-gray-500 mt-2">This feature will have a live demo in the next update.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">{feature.title} Demo</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            {feature.description}
          </div>
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Try it out:</h3>
            {getDemoContent()}
          </div>
        </div>
      </div>
    </div>
  );
}