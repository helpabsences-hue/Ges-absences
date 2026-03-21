'use client'

export const dynamic = 'force-dynamic'
// src/app/auth/register/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { RegisterPayload } from '@/types'
import { LogoIcon } from '@/components/shared/LogoIcon'

const INITIAL: RegisterPayload = {
  schoolName: '',
  city: '',
  ownerName: '',
  email: '',
  password: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<RegisterPayload>(INITIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const set = (field: keyof RegisterPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Registration failed. Please try again.')
      setLoading(false)
      return
    }

    // Success — show check email message
    setSentEmail(form.email)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md text-center">
         <div className={`inline-flex items-center gap-2 mb-3`}>
            <LogoIcon className="w-10 h-10" />
            <span className="text-2xl font-bold text-slate-50 tracking-tight">
              Attend<span className="text-blue-400">efy</span>
            </span>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-5">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Check your email</h2>
              <p className="text-slate-400 text-sm mt-2">
                We sent a confirmation link to
              </p>
              <p className="text-white font-semibold mt-1">{sentEmail}</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-left">
              <p className="text-xs text-amber-300">
                Check your spam folder if you don&apos;t see it. Click the link to activate your account.
              </p>
            </div>
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition">
              ← Go to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 mb-3`}>
            <LogoIcon className="w-10 h-10" />
            <span className="text-2xl font-bold text-slate-50 tracking-tight">
              Attend<span className="text-blue-400">efy</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">Create your school account </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Section label */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              School info
            </p>

            {/* School name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                School name
              </label>
              <input
                type="text"
                required
                value={form.schoolName}
                onChange={set('schoolName')}
                placeholder="Al Amal High School"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                City
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={set('city')}
                placeholder="Casablanca"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Divider */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">
              Your account
            </p>

            {/* Owner name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Your full name
              </label>
              <input
                type="text"
                required
                value={form.ownerName}
                onChange={set('ownerName')}
                placeholder="Ahmed Benali"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
                placeholder="principal@school.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                placeholder="At least 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating your school…
                </>
              ) : (
                'Create School Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
