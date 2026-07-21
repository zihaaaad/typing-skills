'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, User, Mail, BookOpen, Layers, Hash, CheckCircle2, BadgeCheck, AlertTriangle } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';

export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'GENERAL'>('STUDENT');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [courseName, setCourseName] = useState('');
  const [batchName, setBatchName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Metadata for Selectors
  const [metadata, setMetadata] = useState<{ courses: Record<string, string[]> } | null>(null);
  const [metadataError, setMetadataError] = useState(false);
  const [availableRolls, setAvailableRolls] = useState<string[]>([]);
  const [fetchingRolls, setFetchingRolls] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch('/api/admin/metadata');
        if (res.ok) {
          const data = await res.json();
          setMetadata(data);
          if (!data.courses || Object.keys(data.courses).length === 0) {
            setMetadataError(true);
          }
        } else {
          setMetadataError(true);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
        setMetadataError(true);
      }
    };
    fetchMetadata();
  }, []);

  // Reset batch when course changes
  useEffect(() => {
    // eslint-disable-next-line
    setBatchName('');
  }, [courseName]);

  // Fetch unassigned roll numbers when batch changes
  useEffect(() => {
    // eslint-disable-next-line
    setRollNumber('');
    setAvailableRolls([]);
    
    if (!batchName) return;

    const fetchAvailableRolls = async () => {
      setFetchingRolls(true);
      try {
        const res = await fetch(`/api/auth/available-rolls?batchName=${encodeURIComponent(batchName)}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableRolls(data.availableRolls || []);
        }
      } catch (err) {
        console.error("Failed to load available rolls", err);
      } finally {
        setFetchingRolls(false);
      }
    };
    fetchAvailableRolls();
  }, [batchName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationType: activeTab,
          name,
          email,
          password,
          courseName,
          batchName,
          rollNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#111215] text-[#d1d0c5] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-[#1d1e22]/50 border border-neutral-800 p-8 rounded-2xl text-center flex flex-col items-center gap-6 shadow-2xl">
          <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full border border-emerald-500/25">
            <CheckCircle2 size={48} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-neutral-100">Registration Submitted</h2>
            <p className="text-sm text-neutral-400">
              Thank you for registering, <strong className="text-neutral-200">{name}</strong>!
            </p>
          </div>
          
          {activeTab === 'STUDENT' ? (
            <p className="text-neutral-400 text-sm leading-relaxed">
              Your account is currently <span className="text-amber-500 font-semibold">Pending Admin Approval</span>. 
              Once an administrator approves your account, you will be able to log in, access the typing practice modules, view the leaderboards, and complete batch assignments.
            </p>
          ) : (
            <p className="text-neutral-400 text-sm leading-relaxed">
              Your general account has been successfully created and <span className="text-emerald-500 font-semibold">automatically approved</span>.
            </p>
          )}

          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/10"
          >
            Go to Login
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );
  }

  const availableBatches = (metadata && courseName && metadata.courses[courseName]) || [];

  return (
    <main className="min-h-screen bg-[#111215] text-[#d1d0c5] flex flex-col justify-center items-center p-4 py-12">
      {/* Title */}
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <Sparkles className="text-amber-500 group-hover:rotate-12 transition-transform duration-300" size={32} />
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
          Typing Institute
        </h1>
      </Link>

      <div className="w-full max-w-lg bg-[#1d1e22]/50 border border-neutral-800 p-8 rounded-2xl backdrop-blur-md shadow-2xl">
        
        {/* Registration Tabs */}
        <div className="flex bg-neutral-950 p-1 rounded-xl mb-6 border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('STUDENT')}
            className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'STUDENT'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BookOpen size={14} />
            Student
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'GENERAL'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BadgeCheck size={14} />
            General
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-neutral-100 mb-1">
            {activeTab === 'STUDENT' ? 'Student Registration' : 'General Registration'}
          </h2>
          <p className="text-xs text-neutral-400">
            {activeTab === 'STUDENT' 
              ? 'Create a student account. Requires admin approval.' 
              : 'Create a general practice account. Instantly approved.'}
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111215] border border-neutral-800 text-neutral-100 placeholder-neutral-700 focus:outline-hidden focus:border-amber-500/50 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111215] border border-neutral-800 text-neutral-100 placeholder-neutral-700 focus:outline-hidden focus:border-amber-500/50 transition-colors text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Password</label>
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

          {activeTab === 'STUDENT' && (
            <>
              {metadataError && (
                <div className="sm:col-span-2 flex items-start gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 text-amber-400 text-xs">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Course list unavailable right now. Please try again shortly, or contact your administrator if this continues.</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Course Name</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                  <select
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111215] border border-neutral-800 text-neutral-100 focus:outline-hidden focus:border-amber-500/50 transition-colors text-sm appearance-none"
                  >
                    <option value="">-- Select a Course --</option>
                    {metadata?.courses && Object.keys(metadata.courses).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Batch Name</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                  <select
                    required
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    disabled={!courseName}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111215] border border-neutral-800 text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-hidden focus:border-amber-500/50 transition-colors text-sm appearance-none"
                  >
                    <option value="">-- Select Batch --</option>
                    {availableBatches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Roll Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                  <select
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    disabled={!batchName || fetchingRolls}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#111215] border border-neutral-800 text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-hidden focus:border-amber-500/50 transition-colors text-sm appearance-none"
                  >
                    <option value="">
                      {!batchName ? '-- Select Batch First --' : fetchingRolls ? 'Loading...' : '-- Select Roll --'}
                    </option>
                    {availableRolls.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`sm:col-span-2 flex items-center justify-center gap-2 ${
              activeTab === 'STUDENT' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500 hover:bg-emerald-400'
            } disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-500 font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg active:scale-98 mt-2`}
          >
            {loading ? 'Submitting Registration...' : 'Register'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="mt-8 text-neutral-500 text-xs text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-amber-500 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}
