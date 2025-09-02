'use client';

import { supabase } from '../../../lib/supabase';

/**
 * Security utility functions for authentication and authorization
 */

export const securityUtils = {
  /**
   * Safely store session data without exposing tokens in URLs
   */
  async setSecureSession(accessToken: string, refreshToken: string) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Failed to set secure session:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Security error setting session:', error);
      throw error;
    }
  },

  /**
   * Clean URL to remove any sensitive parameters
   */
  cleanUrl() {
    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  },

  /**
   * Validate access token format
   */
  isValidToken(token: string): boolean {
    if (!token) return false;
    
    // Basic JWT format validation
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if it's a valid JWT structure
    try {
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get user session safely
   */
  async getSecureSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Failed to get secure session:', error);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Security error getting session:', error);
      return null;
    }
  },

  /**
   * Logout and clean up
   */
  async secureLogout() {
    try {
      await supabase.auth.signOut();
      this.cleanUrl();
    } catch (error) {
      console.error('Security error during logout:', error);
    }
  }
};
