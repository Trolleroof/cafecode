"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 bg-cream-beige">
      <div className="flex flex-col items-center mb-6">
        <img src="/images/logo.png" alt="Cafécode Logo" className="h-14 w-14 object-contain rounded-xl mb-2" />
        <h1 className="text-3xl font-heading font-bold text-medium-coffee pt-4">Cafécode</h1>
      </div>
      <div className="bg-light-cream rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-medium-coffee">
          {mode === 'login' ? 'Sign In' : 'Sign Up'}
        </h2>
        <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 border border-medium-coffee bg-cream-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee placeholder:text-gray-400 transition-all"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-medium-coffee bg-cream-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee placeholder:text-gray-400 transition-all"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-medium-coffee bg-cream-beige rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee placeholder:text-gray-400 transition-all"
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full btn-coffee-primary py-2 text-lg"
            disabled={loading}
          >
            {loading ? (mode === 'login' ? 'Signing In...' : 'Signing Up...') : (mode === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        <div className="my-4 flex items-center justify-center">
          <span className="text-gray-400">or</span>
        </div>
        <button
          onClick={handleGoogle}
          className="w-full btn-coffee-secondary py-2 text-lg flex items-center justify-center gap-2"
          disabled={loading}
        >
          <img src="/images/google-logo.png" alt="Google" className="h-5 w-5" />
          {mode === 'login' ? 'Sign In with Google' : 'Sign Up with Google'}
        </button>
        <div className="mt-6 text-center">
          {mode === 'login' ? (
            <>
              <span className="text-gray-600">Don't have an account? </span>
              <button
                onClick={() => setMode('signup')}
                className="text-medium-coffee font-semibold hover:underline"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-600">Already have an account? </span>
              <button
                onClick={() => setMode('login')}
                className="text-medium-coffee font-semibold hover:underline"
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 