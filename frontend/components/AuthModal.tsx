'use client'

import React, { useState } from 'react'
import { X, Mail, Lock, User, Coffee, Loader2 } from 'lucide-react'
import { auth } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'signin' | 'signup'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      if (mode === 'signin') {
        const { error } = await auth.signIn(email, password)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Successfully signed in!')
          setTimeout(() => onClose(), 1000)
        }
      } else {
        const { error } = await auth.signUp(email, password)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Account created successfully! Please check your email to verify your account.')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-light-cream/95 border border-medium-coffee/20 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden backdrop-blur-md">
        {/* Coffee-themed header */}
        <div className="bg-gradient-to-r from-medium-coffee to-deep-espresso p-6 text-light-cream flex flex-col items-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-light-cream/20 rounded-full transition-colors opacity-60 hover:opacity-100"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center space-y-2 mb-2">
            <div className="w-12 h-12 bg-light-cream/20 rounded-full flex items-center justify-center mb-1">
              <Coffee className="h-7 w-7" />
            </div>
              <h2 className="text-2xl font-bold">
                {mode === 'signin' ? 'Welcome Back' : 'Join Cafécode'}
              </h2>
              <p className="text-light-cream/80 text-sm">
                {mode === 'signin' 
                  ? 'Sign in to continue your coding journey' 
                  : 'Start your coding adventure today'
                }
              </p>
            </div>
          {/* Mode Switcher */}
          <div className="flex justify-center items-center gap-2 mt-2 mb-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); resetForm(); }}
              className={`px-5 py-2 rounded-full font-semibold transition-colors text-base ${mode === 'signin' ? 'bg-light-cream text-medium-coffee shadow' : 'bg-transparent text-light-cream/70 hover:bg-light-cream/10'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); resetForm(); }}
              className={`px-5 py-2 rounded-full font-semibold transition-colors text-base ${mode === 'signup' ? 'bg-light-cream text-medium-coffee shadow' : 'bg-transparent text-light-cream/70 hover:bg-light-cream/10'}`}
            >
              Get Started
            </button>
          </div>
        </div>
        {/* Form */}
        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-deep-espresso font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-medium-coffee" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-cream-beige border-medium-coffee/30 focus:border-medium-coffee text-dark-charcoal"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-deep-espresso font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-medium-coffee" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-cream-beige border-medium-coffee/30 focus:border-medium-coffee text-dark-charcoal"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-deep-espresso font-semibold">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-medium-coffee" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-cream-beige border-medium-coffee/30 focus:border-medium-coffee text-dark-charcoal"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-coffee-primary py-3 text-lg font-semibold"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{mode === 'signin' ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                </div>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}