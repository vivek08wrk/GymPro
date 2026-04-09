'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/lib/api';
import LoginLoader from '@/components/LoginLoader';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginAdmin({ username, password });
      localStorage.setItem('token', res.data.token);
      // Show loader instead of immediate redirect
      setShowLoader(true);
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoginLoader isVisible={showLoader} />
      <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="bg-surface-container-high/50 backdrop-blur-heavy p-8 rounded-kinetic border border-outline-variant/10 w-full max-w-md shadow-kinetic">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black italic tracking-tighter text-primary mb-2">GymPro</h1>
          <p className="text-on-surface-variant font-inter-tight font-bold uppercase tracking-widest text-xs">Admin Portal</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-secondary/20 text-secondary text-sm px-4 py-3 rounded-kinetic mb-6 border border-secondary/30">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin"
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-kinetic px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-light hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 text-black font-black italic py-3 rounded-kinetic transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm font-inter-tight shadow-lg hover:shadow-primary/30"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-on-surface-variant text-xs mt-6 font-inter-tight uppercase tracking-widest">
          Demo: admin / admin
        </p>

      </div>
    </div>
    </>
  );
}