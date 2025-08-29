'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface ProjectManagerState {
  projectCount: number;
  hasUnlimitedAccess: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useProjectManager() {
  const [state, setState] = useState<ProjectManagerState>({
    projectCount: 0,
    hasUnlimitedAccess: false,
    isLoading: true,
    error: null,
  });

  const [user, setUser] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Ensure hydration is complete before making API calls
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      checkUser();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          checkUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setState(prev => ({
            ...prev,
            projectCount: 0,
            hasUnlimitedAccess: false,
            isLoading: false,
          }));
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [isHydrated]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchUserData(user.id);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setState(prev => ({ ...prev, error: 'Failed to check user status', isLoading: false }));
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch user profile for payment status and project count
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('has_unlimited_access, payment_status, project_count')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      const projectCount = profile?.project_count || 0;
      const hasUnlimitedAccess = profile?.has_unlimited_access || false;

      setState({
        projectCount,
        hasUnlimitedAccess,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch user data',
        isLoading: false,
      }));
    }
  };

  const createProject = async (projectName: string, projectType: string = 'general') => {
    if (!user) {
      throw new Error('Please log in');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if user can create more projects - updated to use 1 free project limit
      if (state.projectCount >= 1 && !state.hasUnlimitedAccess) {
        throw new Error('Project limit reached. Please upgrade to create unlimited projects.');
      }

      // Update project count in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ project_count: state.projectCount + 1 })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh user data to get updated project count
      await fetchUserData(user.id);

      return 'project-created'; // Placeholder return value

    } catch (error) {
      console.error('Error creating project:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false,
      }));
      throw error;
    }
  };

  const refreshData = () => {
    if (user) {
      fetchUserData(user.id);
    }
  };

  return {
    ...state,
    user,
    createProject,
    refreshData,
  };
}
