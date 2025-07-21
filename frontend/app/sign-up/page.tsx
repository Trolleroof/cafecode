"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const SignUpPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Optionally, you can check if email confirmation is required
      router.push('/ide');
    }
  };

  const handleSignUpWithGoogle = async () => {
    setLoading(true);
    setError('');
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-beige">
      <div className="bg-light-cream rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-medium-coffee">Sign Up</h2>
        <form onSubmit={handleSignUp} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-medium-coffee"
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full btn-coffee-primary py-2 text-lg"
            disabled={loading}
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
        <div className="my-4 flex items-center justify-center">
          <span className="text-gray-400">or</span>
        </div>
        <button
          onClick={handleSignUpWithGoogle}
          className="w-full btn-coffee-secondary py-2 text-lg flex items-center justify-center gap-2"
          disabled={loading}
        >
          <img src="/images/logo-trans.png" alt="Google" className="h-5 w-5" />
          Sign Up with Google
        </button>
        <div className="mt-6 text-center">
          <span className="text-gray-600">Already have an account? </span>
          <button
            onClick={() => router.push('/')}
            className="text-medium-coffee font-semibold hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage; 