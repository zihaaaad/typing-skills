'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowRight, Mail } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';

// Only follow the redirect target if it's a same-site relative path — an
// absolute or protocol-relative ("//evil.com") value could send a logged-in
// user off-site.
function isSafeRedirect(path: string | null): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//');
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const redirectTo = searchParams.get('redirect');
      if (isSafeRedirect(redirectTo)) {
        router.push(redirectTo);
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111215] text-[#d1d0c5] flex flex-col justify-center items-center p-4">
      {/* Title */}
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <Sparkles className="text-amber-500 group-hover:rotate-12 transition-transform duration-300" size={32} />
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
          Typing Institute
        </h1>
      </Link>

      <div className="w-full max-w-md bg-[#1d1e22]/50 border border-neutral-800 p-8 rounded-2xl backdrop-blur-md shadow-2xl">
        <h2 className="text-xl font-bold text-neutral-100 mb-6">Welcome Back</h2>
        
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111215] border border-neutral-800 text-neutral-100 placeholder-neutral-700 focus:outline-hidden focus:border-amber-500/50 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Password</label>
              <Link href="/forgot-password" className="text-amber-500 hover:underline text-xs">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              required
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-500 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-98 mt-2"
          >
            {loading ? 'Logging in...' : 'Log In'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-8 text-neutral-500 text-xs text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-amber-500 hover:underline">
            Register as Student
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
