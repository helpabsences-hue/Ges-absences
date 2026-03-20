'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/auth-client'

type State = 'loading' | 'ready' | 'done'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [state,   setState]   = useState<State>('loading')
  const [pwd,     setPwd]     = useState('')
  const [confirm, setConfirm] = useState('')
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    // Use the same auth client as forgot-password
    // Both use the same localStorage key — code_verifier will be found
    const supabase = createAuthClient()

    const params = new URLSearchParams(window.location.search)
    const code   = params.get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error) {
            console.error('Exchange error:', error.message)
          } else if (data.session) {
            window.history.replaceState({}, '', '/auth/reset-password')
            setState('ready')
          }
        })
      return
    }

    // Listen for PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setState('ready')
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setState('ready')
    })

    return () => { subscription.unsubscribe() }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwd || pwd.length < 8) { setErr('Minimum 8 caractères.'); return }
    if (pwd !== confirm)         { setErr('Les mots de passe ne correspondent pas.'); return }
    setSaving(true); setErr('')
    const supabase = createAuthClient()
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setSaving(false)
    if (error) { setErr(error.message); return }
    await supabase.auth.signOut()
    setState('done')
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  if (state === 'done') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <p className="text-white font-semibold text-lg">Mot de passe mis à jour !</p>
        <p className="text-slate-400 text-sm animate-pulse">Redirection…</p>
      </div>
    </div>
  )

  if (state === 'loading') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <svg className="w-8 h-8 text-blue-400 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <p className="text-slate-400 text-sm">Chargement…</p>
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
          <p className="text-slate-400 text-sm">Choisissez un nouveau mot de passe</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nouveau mot de passe</label>
              <input type="password" value={pwd} onChange={e => { setPwd(e.target.value); setErr('') }}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmer</label>
              <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setErr('') }}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
              {saving ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>Mise à jour…</>) : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
