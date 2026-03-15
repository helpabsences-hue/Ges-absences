'use client'

export const dynamic = 'force-dynamic'
// app/auth/login/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { LogoIcon } from '@/components/shared/LogoIcon'

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
  const [showPwd,  setShowPwd]  = useState(false)

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
    router.push(profile?.role === 'teacher' ? '/teacher' : '/dashboard')
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
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
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
              <label className="block text-sm font-medium text-slate-600  mb-1.5">
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
        </div>
      </div>
    </div>
  )
}
