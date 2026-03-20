'use client'
export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function ForgotPasswordContent() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [err,     setErr]     = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setErr("Email obligatoire"); return }
    setLoading(true); setErr('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/auth/reset-password',
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  if (sent) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Email envoyé !</p>
          <p className="text-slate-400 text-sm mt-1">Vérifiez votre boîte mail et cliquez sur le lien.</p>
          <p className="text-slate-500 text-xs mt-1">Vérifiez aussi les spams.</p>
        </div>
        <Link href="/auth/login" className="inline-block text-blue-400 hover:text-blue-300 text-sm">
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">Attend<span className="text-blue-400">ify</span></span>
          </div>
          <p className="text-slate-400 text-sm">Mot de passe oublié</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={send} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Adresse email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr('') }}
                placeholder="vous@ecole.com" autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition">
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition">
                ← Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  )
}
