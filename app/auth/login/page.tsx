'use client'

export const dynamic = 'force-dynamic'
// app/auth/login/page.tsx

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { initUserSettings } from '@/stores/useSettingsStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { LogoIcon } from '@/components/shared/LogoIcon'

// ── PWA Install Banner ─────────────────────────────────────
function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show,   setShow]   = useState(false)
  const [ios,    setIos]    = useState(false)
  const [iosMsg, setIosMsg] = useState(false)

  useEffect(() => {
    // Detect iOS
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isInStandaloneMode = (window.navigator as any).standalone === true
    if (isIos && !isInStandaloneMode) { setIos(true); setShow(true) }

    // Android/Chrome install prompt
    const handler = (e: any) => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show) return null

  const handleInstall = async () => {
    if (ios) { setIosMsg(true); setTimeout(() => setIosMsg(false), 6000); return }
    if (prompt) { prompt.prompt(); const { outcome } = await prompt.userChoice; if (outcome === 'accepted') setShow(false) }
  }

  return (
    <>
      {/* iOS floating toast — rendered separately so fixed positioning works */}
      {iosMsg && (
        <div style={{ position: 'fixed', bottom: '90px', left: '16px', right: '16px', zIndex: 9999 }}
          className="bg-slate-800 border border-slate-600 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3">
          <span className="text-xl shrink-0">📱</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Installer sur iPhone</p>
            <p className="text-xs text-slate-300 mt-0.5">
              Appuyez sur <strong>Partager</strong> (↑) en bas de Safari, puis <strong>"Sur l'écran d'accueil"</strong>
            </p>
          </div>
          <button onClick={() => setIosMsg(false)} className="text-slate-400 hover:text-white shrink-0 text-lg leading-none">✕</button>
        </div>
      )}

      {/* Install banner */}
      <div className="mt-4 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-white">Installez Attendefy</p>
            <p className="text-xs text-slate-400">Accès rapide depuis votre téléphone</p>
          </div>
        </div>
        <button onClick={handleInstall}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition">
          Installer
        </button>
      </div>
    </>
  )
}

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  tagline: string
  emailLabel: string; emailPlaceholder: string
  passwordLabel: string
  forgotPassword: string
  signIn: string; signingIn: string
  newSchool: string; registerHere: string
  errDefault: string
}> = {
  fr: {
    tagline: 'Connectez-vous à votre espace école',
    emailLabel: 'Adresse email', emailPlaceholder: 'vous@ecole.com',
    passwordLabel: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    signIn: 'Se connecter', signingIn: 'Connexion…',
    newSchool: 'Nouvelle école ?', registerHere: 'Créer un compte',
    errDefault: 'Échec de connexion. Veuillez réessayer.',
  },
  en: {
    tagline: 'Sign in to your school account',
    emailLabel: 'Email address', emailPlaceholder: 'you@school.com',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign In', signingIn: 'Signing in…',
    newSchool: 'New school?', registerHere: 'Register here',
    errDefault: 'Login failed. Please try again.',
  },
  ar: {
    tagline: 'سجّل الدخول إلى حساب مدرستك',
    emailLabel: 'البريد الإلكتروني', emailPlaceholder: 'انت@مدرسة.com',
    passwordLabel: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    signIn: 'تسجيل الدخول', signingIn: 'جارٍ الدخول…',
    newSchool: 'مدرسة جديدة؟', registerHere: 'إنشاء حساب',
    errDefault: 'فشل تسجيل الدخول. حاول مجدداً.',
  },
}

export default function LoginPage() {
  const router        = useRouter()
  const fetchProfile  = useAuthStore(s => s.fetchProfile)
  const { language }  = useSettingsStore()
  const lang   = (language || 'fr') as Lang
  const ui     = UI[lang]
  const isRtl  = lang === 'ar'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPwd,    setShowPwd]    = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaved,   setPwdSaved]   = useState(false)

  useEffect(() => {
    const hash   = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const type   = params.get('type')
    const token  = params.get('access_token')
    const refresh = params.get('refresh_token') ?? ''

    if ((type === 'recovery' || type === 'invite') && token) {
      window.history.replaceState({}, '', '/auth/login')
      const supabase = createClient()
      supabase.auth.setSession({ access_token: token, refresh_token: refresh })
        .finally(() => setIsRecovery(true))
    }
  }, [])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPwd || newPwd.length < 8) { setError('Minimum 8 caractères.'); return }
    if (newPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password: newPwd })
    if (updateError) { setError(updateError.message); setLoading(false); return }

    // Mark parent invitation as accepted
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      // Update directly by parent_email — works even if profile has no student_id
      await supabase
        .from('students')
        .update({ parent_invite_status: 'accepted' })
        .eq('parent_email', user.email)

      // Also try via profile student_id as backup
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, student_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.role === 'parent' && profile?.student_id) {
        await supabase
          .from('students')
          .update({ parent_invite_status: 'accepted' })
          .eq('id', profile.student_id)
      }
    }

    await supabase.auth.signOut()
    setPwdSaved(true)
    setLoading(false)
    setTimeout(() => router.push('/auth/login'), 2000)
  }

  // Show password creation form for parent invitation
  if (isRecovery) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <LogoIcon className="w-10 h-10" />
            <span className="text-2xl font-bold text-white">Attend<span className="text-blue-400">efy</span></span>
          </div>
          <p className="text-slate-400 text-sm">Créez votre mot de passe pour accéder à votre espace parent</p>
        </div>
        {pwdSaved ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p className="text-white font-semibold">Mot de passe créé avec succès !</p>
            <p className="text-slate-400 text-sm animate-pulse">Redirection vers la connexion…</p>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleSetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nouveau mot de passe</label>
                <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setError('') }}
                  placeholder="••••••••" minLength={8}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirmer le mot de passe</label>
                <input type="password" value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setError('') }}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : null}
                {loading ? 'Enregistrement…' : 'Créer mon mot de passe'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !data.user) {
      setError(authError?.message ?? ui.errDefault)
      setLoading(false)
      return
    }

    await fetchProfile()
    const profile = useAuthStore.getState().profile
    if (profile?.id) initUserSettings(profile.id)

    // If parent — mark invitation as accepted
    if (profile?.role === 'parent') {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        await supabase
          .from('students')
          .update({ parent_invite_status: 'accepted' })
          .eq('parent_email', user.email)
        if (profile?.student_id) {
          await supabase
            .from('students')
            .update({ parent_invite_status: 'accepted' })
            .eq('id', profile.student_id)
        }
      }
    }

    if (profile?.role === 'teacher')             router.push('/teacher')
    else if (profile?.role === 'parent')         router.push('/parent')
    else if (profile?.role === 'platform_admin') router.push('/super-admin')
    else                                         router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <LogoIcon className="w-10 h-10" />
            <span className="text-2xl font-bold text-slate-50 tracking-tight">
              Attend<span className="text-blue-400">efy</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">{ui.tagline}</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {ui.emailLabel}
              </label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder={ui.emailPlaceholder}
                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                  placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${isRtl ? 'text-right' : ''}`}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {ui.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                    placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                    ${isRtl ? 'text-right pl-16' : 'pr-16'}`}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className={`absolute top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 transition
                    ${isRtl ? 'left-4' : 'right-4'}`}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className={`flex -mt-2 ${isRtl ? 'justify-start' : 'justify-end'}`}>
              <Link href="/auth/forgot-password"
                className="text-xs text-slate-500 hover:text-blue-400 transition">
                {ui.forgotPassword}
              </Link>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {ui.signingIn}
                </>
              ) : ui.signIn}
            </button>
          </form>

          <p className={`mt-6 text-center text-sm text-slate-500 ${isRtl ? 'text-right' : ''}`}>
            {ui.newSchool}{' '}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 font-medium transition">
              {ui.registerHere}
            </Link>
          </p>

          {/* Install app banner */}
          <InstallBanner />
        </div>
      </div>
    </div>
  )
}