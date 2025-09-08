'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useProjectManager } from '../../hooks/useProjectManager';
import PaymentModal from '../../components/PaymentModal';
import ProjectCounter from '../../components/ProjectCounter';

export default function PaymentTestPage() {
  const { user, projectCount, hasUnlimitedAccess, createProject, refreshData } = useProjectManager();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [grantingAccess, setGrantingAccess] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    setCreating(true);
    try {
      await createProject(newProjectName.trim());
      setNewProjectName('');
      alert('Project created successfully!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleGrantUnlimitedAccess = async () => {
    setGrantingAccess(true);
    try {
      // Include Supabase access token for backend auth
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/admin/grant-unlimited-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grant unlimited access');
      }

      alert(data.message || 'Unlimited access granted successfully!');
      // Refresh the user data to reflect the changes
      await refreshData();
    } catch (error) {
      console.error('Error granting unlimited access:', error);
      alert(error instanceof Error ? error.message : 'Failed to grant unlimited access');
    } finally {
      setGrantingAccess(false);
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
              : `You can create ${1 - projectCount} more free project.`
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
          <div className="flex gap-4 flex-wrap">
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
            <button
              onClick={handleGrantUnlimitedAccess}
              disabled={grantingAccess}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {grantingAccess ? 'Granting...' : 'Grant Unlimited Access'}
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
