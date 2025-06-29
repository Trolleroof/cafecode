'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      setSession(session)
      if (session?.user) {
        await fetchUserProfile(session.user.id)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // If profile doesn't exist, create a basic user object from auth data
        if (error.code === 'PGRST116') {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setUser({
              id: user.id,
              email: user.email || '',
              username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
              created_at: user.created_at,
              updated_at: user.updated_at || user.created_at
            })
          }
        }
        return
      }

      setUser(data)
    } catch (error) {
      // Silently handle profile fetch errors
      console.log('Profile fetch handled gracefully')
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      })

      if (error) {
        console.error('Sign up error:', error)
        return { error }
      }

      // Try to create profile, but don't fail if it doesn't work
      if (data.user) {
        try {
          await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                email: data.user.email,
                username,
              },
            ])
        } catch (profileError) {
          // Silently ignore profile creation errors
          // The user can still use the app with auth data
          console.log('Profile creation handled gracefully')
        }
      }

      console.log('Sign up successful:', data.user?.email)
      return { error: null }
    } catch (error) {
      console.error('Sign up exception:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Sign in error:', error)
        return { error }
      }

      console.log('Sign in successful:', data.user?.email)
      return { error: null }
    } catch (error) {
      console.error('Sign in exception:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        console.error('Google sign in error:', error)
        return { error }
      }
      
      return { error: null }
    } catch (error) {
      console.error('Google sign in exception:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}