'use client'

export const dynamic = 'force-dynamic'
// src/app/auth/invite/page.tsx

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogoIcon } from '@/components/shared/LogoIcon'

function InviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    if (!token) setError('Lien d\'invitation invalide. Veuillez demander un nouveau lien.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/accept-staff-invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token, name, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Une erreur s\'est produite.')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  if (done) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Compte créé avec succès !</h2>
        <p className="text-slate-400 text-sm animate-pulse">Redirection vers la connexion…</p>
        <button onClick={() => router.push('/auth/login')}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition">
          Se connecter maintenant →
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-xl font-semibold text-white">Accepter votre invitation</h2>
        <p className="text-slate-400 text-sm mt-1">Créez votre compte Attendefy ci-dessous</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Votre nom complet</label>
        <input type="text" required value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Prénom et nom"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Choisir un mot de passe</label>
        <input type="password" required minLength={8} autoComplete="new-password"
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Au moins 8 caractères"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading || !token}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
        {loading ? (
          <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>Création du compte…</>
        ) : 'Activer mon compte'}
      </button>

      <p className="text-center text-sm text-slate-400">
        Vous avez déjà un compte ?{' '}
        <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
          Se connecter
        </Link>
      </p>
    </form>
  )
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"/>
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <LogoIcon className="w-8 h-8 shrink-0"/>
            <span className="text-lg font-bold tracking-tight text-white">
              Attend<span className="text-blue-400">efy</span>
            </span>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Suspense fallback={<div className="text-center py-8 text-slate-400">Chargement…</div>}>
            <InviteForm/>
          </Suspense>
        </div>
      </div>
    </div>
  )
}