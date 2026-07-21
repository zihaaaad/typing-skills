'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111215] text-[#d1d0c5] flex flex-col justify-center items-center p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <Sparkles className="text-amber-500 group-hover:rotate-12 transition-transform duration-300" size={32} />
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
          Typing Institute
        </h1>
      </Link>

      <div className="w-full max-w-md bg-[#1d1e22]/50 border border-neutral-800 p-8 rounded-2xl backdrop-blur-md shadow-2xl">
        {!token ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="bg-red-500/10 text-red-400 p-4 rounded-full border border-red-500/25">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-xl font-bold text-neutral-100">Invalid Link</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              This password reset link is missing its token. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/10 mt-2"
            >
              Request New Link
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full border border-emerald-500/25">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-bold text-neutral-100">Password Updated</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Your password has been changed successfully. You can now log in with your new password.
            </p>
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/10 mt-2"
            >
              Go to Login
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-neutral-100 mb-1">Set a New Password</h2>
            <p className="text-xs text-neutral-400 mb-6">Choose a new password for your account.</p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
                {error}
                {error.toLowerCase().includes('expired') && (
                  <>
                    {' '}
                    <Link href="/forgot-password" className="underline font-semibold">
                      Request a new link
                    </Link>
                  </>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">New Password</label>
                <PasswordInput
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Choose a secure password"
                />
                <span className="text-neutral-600 text-[11px]">At least 8 characters</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Confirm Password</label>
                <PasswordInput
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-500 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/10 active:scale-98 mt-2"
              >
                {loading ? 'Updating...' : 'Update Password'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
