'use client';

import React, { useState } from 'react';
import { IconMail, IconLock, IconBrandGoogle, IconArrowLeft, IconUser } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Handle sign up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        
        if (error) {
          setError(error.message);
        } else {
          // Redirect to IDE after successful sign up
          router.push('/ide');
        }
      } else {
        // Handle sign in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          setError(error.message);
        } else {
          // Redirect to home page after successful login
          router.push('/');
        }
      }
    } catch (error: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' });
    } catch (error: any) {
      setError('Google authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-cream-beige to-light-cream flex items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        {/* Enhanced Back to Home Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Link 
            href="/" 
            className="group inline-flex items-center gap-3 text-medium-coffee hover:text-deep-espresso transition-all duration-300 mb-6 px-4 py-2 rounded-xl hover:bg-white/20 hover:shadow-sm"
          >
            <IconArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </motion.div>

        {/* Enhanced Auth Card with Apple-style design */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 relative overflow-hidden"
        >
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/60 pointer-events-none"></div>
          
          <div className="relative z-10 p-8">
            {/* Enhanced Logo and Header */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            >
              <div className="relative mb-4">
                <Image
                  src="/images/logo-trans.png"
                  alt="Cafécode"
                  width={80}
                  height={80}
                  className="mx-auto"
                />
              </div>
              
              <h1 className="text-3xl font-bold text-dark-charcoal mb-2 tracking-tight">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h1>
              <p className="text-deep-espresso text-base leading-relaxed max-w-sm mx-auto">
                {isSignUp ? 'Join us to start your coding journey' : 'Sign in to continue your coding journey'}
              </p>
            </motion.div>

            {/* Enhanced Auth Form */}
            <motion.form 
              onSubmit={handleAuth} 
              className="space-y-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            >
              {/* Name Field - Only show for sign up */}
              <AnimatePresence>
                {isSignUp && (
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: '1.25rem' }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <label htmlFor="name" className="block text-sm font-semibold text-dark-charcoal">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-medium-coffee/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-medium-coffee/20 focus:border-medium-coffee transition-all duration-300 bg-white/80 hover:bg-white backdrop-blur-sm placeholder:text-medium-coffee/50"
                      placeholder="Enter your full name"
                      required={isSignUp}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Field */}
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
              >
                <label htmlFor="email" className="block text-sm font-semibold text-dark-charcoal">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-medium-coffee/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-medium-coffee/20 focus:border-medium-coffee transition-all duration-300 bg-white/80 hover:bg-white backdrop-blur-sm placeholder:text-medium-coffee/50"
                  placeholder="Enter your email"
                  required
                />
              </motion.div>

              {/* Password Field */}
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
              >
                <label htmlFor="password" className="block text-sm font-semibold text-dark-charcoal">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-medium-coffee/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-medium-coffee/20 focus:border-medium-coffee transition-all duration-300 bg-white/80 hover:bg-white backdrop-blur-sm placeholder:text-medium-coffee/50"
                  placeholder="Enter your password"
                  required
                />
              </motion.div>

              {/* Enhanced Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium shadow-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Enhanced Auth Button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-medium-coffee to-deep-espresso hover:from-deep-espresso hover:to-medium-coffee text-light-cream py-3 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl focus:ring-4 focus:ring-medium-coffee/30 focus:outline-none"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-light-cream/30 border-t-light-cream rounded-full animate-spin"></div>
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </motion.button>
            </motion.form>

            {/* Enhanced Divider */}
            <motion.div 
              className="my-6 flex items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.0, ease: "easeOut" }}
            >
              <div className="flex-1 border-t-2 border-medium-coffee/10"></div>
              <span className="px-6 text-sm font-medium text-medium-coffee/60">or</span>
              <div className="flex-1 border-t-2 border-medium-coffee/10"></div>
            </motion.div>

            {/* Enhanced Google Auth */}
            <motion.button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-white/80 backdrop-blur-sm border-2 border-medium-coffee/20 text-dark-charcoal py-3 px-6 rounded-2xl font-semibold text-lg hover:bg-white hover:border-medium-coffee/30 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-medium-coffee/20 focus:outline-none"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Image 
                src="/images/google-logo.png" 
                alt="Google" 
                width={20} 
                height={20} 
                className="w-5 h-5"
              />
              Continue with Google
            </motion.button>

            {/* Toggle Mode Link */}
            <motion.div 
              className="text-center mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
            >
              <p className="text-deep-espresso text-base">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={toggleMode}
                  className="text-medium-coffee hover:text-deep-espresso font-semibold transition-colors duration-200 underline decoration-2 underline-offset-4 hover:decoration-medium-coffee/50"
                >
                  {isSignUp ? 'Sign in here' : 'Sign up here'}
                </button>
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 