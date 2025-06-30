'use client'

import React, { useState } from 'react'
import { User, LogOut, Settings, Coffee, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import AuthModal from './AuthModal'

export default function UserMenu() {
  const { user, loading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setShowDropdown(false)
  }

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode)
    setShowAuthModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-medium-coffee/20 rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => openAuthModal('signin')}
            variant="ghost"
            className="text-light-cream hover:text-cream-beige hover:bg-medium-coffee/20 font-medium"
          >
            Sign In
          </Button>
          <Button
            onClick={() => openAuthModal('signup')}
            className="btn-coffee-primary"
          >
            Get Started
          </Button>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      </>
    )
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 bg-medium-coffee/20 hover:bg-medium-coffee/30 rounded-xl px-4 py-2 transition-colors"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-medium-coffee to-deep-espresso rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-light-cream" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-light-cream font-semibold text-sm">
              {user.email?.split('@')[0]}
            </p>
            <p className="text-cream-beige text-xs">
              {user.email}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-cream-beige" />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-light-cream rounded-xl shadow-xl border border-medium-coffee/20 py-2 z-50">
            <div className="px-4 py-3 border-b border-medium-coffee/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-medium-coffee to-deep-espresso rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-light-cream" />
                </div>
                <div>
                  <p className="text-dark-charcoal font-semibold">
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-deep-espresso text-sm">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="py-2">
              <button className="w-full px-4 py-2 text-left hover:bg-cream-beige flex items-center space-x-3 text-deep-espresso">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
              
              <button className="w-full px-4 py-2 text-left hover:bg-cream-beige flex items-center space-x-3 text-deep-espresso">
                <Coffee className="h-4 w-4" />
                <span>My Projects</span>
              </button>
              
              <hr className="my-2 border-medium-coffee/20" />
              
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-3 text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </>
  )
}