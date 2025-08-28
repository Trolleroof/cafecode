'use client';

import React, { useState } from 'react';
import { useProjectManager } from '../../hooks/useProjectManager';
import PaymentModal from '../../components/PaymentModal';
import ProjectCounter from '../../components/ProjectCounter';

export default function PaymentTestPage() {
  const { user, projectCount, hasUnlimitedAccess, createProject, refreshData } = useProjectManager();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setCreating(true);
    try {
      await createProject(newProjectName.trim());
      setNewProjectName('');
      alert('Project created successfully!');
    } catch (error) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-light-cream flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-medium-coffee mb-4">Please Sign In</h1>
          <p className="text-deep-espresso">You need to be signed in to test the payment system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-cream p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-medium-coffee mb-8">Payment System Test</h1>
        
        {/* Project Counter */}
        <div className="mb-8">
          <ProjectCounter
            projectCount={projectCount}
            hasUnlimitedAccess={hasUnlimitedAccess}
            onUpgradeClick={() => setShowPaymentModal(true)}
          />
        </div>

        {/* Project Creation */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold text-dark-charcoal mb-4">Create New Project</h2>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
            />
            <button
              onClick={handleCreateProject}
              disabled={creating || !newProjectName.trim()}
              className="btn-coffee-primary px-6 py-2 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
          <p className="text-sm text-deep-espresso mt-2">
            {hasUnlimitedAccess 
              ? 'You have unlimited access to create projects!' 
              : `You can create ${3 - projectCount} more free projects.`
            }
          </p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-lg">
          <h2 className="text-xl font-semibold text-dark-charcoal mb-4">User Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">User ID:</span>
              <span className="ml-2 text-deep-espresso">{user.id}</span>
            </div>
            <div>
              <span className="font-semibold">Email:</span>
              <span className="ml-2 text-deep-espresso">{user.email}</span>
            </div>
            <div>
              <span className="font-semibold">Project Count:</span>
              <span className="ml-2 text-deep-espresso">{projectCount}</span>
            </div>
            <div>
              <span className="font-semibold">Unlimited Access:</span>
              <span className="ml-2 text-deep-espresso">{hasUnlimitedAccess ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-dark-charcoal mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-coffee-primary px-6 py-2"
            >
              Test Payment Modal
            </button>
            <button
              onClick={refreshData}
              className="btn-coffee-secondary px-6 py-2"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        projectCount={projectCount}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          refreshData();
        }}
      />
    </div>
  );
}
