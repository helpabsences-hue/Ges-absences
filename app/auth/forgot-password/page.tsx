'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSettingsStore } from '@/stores/useSettingsStore'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string
  emailLabel: string; emailPlaceholder: string
  sendBtn: string; sending: string; backToLogin: string
  successTitle: string; successDesc: string; successHint: string
  errRequired: string; errExpired: string
}> = {
  fr: {
    title: 'Mot de passe oublié',
    subtitle: 'Entrez votre email pour recevoir un lien de réinitialisation',
    emailLabel: 'Adresse email', emailPlaceholder: 'vous@ecole.com',
    sendBtn: 'Envoyer le lien', sending: 'Envoi en cours…',
    backToLogin: 'Retour à la connexion',
    successTitle: 'Email envoyé !',
    successDesc: 'Un lien de réinitialisation a été envoyé à',
    successHint: 'Vérifiez aussi vos spams si vous ne le trouvez pas.',
    errRequired: "L'adresse email est obligatoire.",
    errExpired: 'Lien expiré. Veuillez demander un nouveau lien.',
  },
  en: {
    title: 'Forgot password',
    subtitle: 'Enter your email to receive a password reset link',
    emailLabel: 'Email address', emailPlaceholder: 'you@school.com',
    sendBtn: 'Send reset link', sending: 'Sending…',
    backToLogin: 'Back to login',
    successTitle: 'Check your inbox',
    successDesc: 'We sent a reset link to',
    successHint: "Don't see it? Check your spam folder.",
    errRequired: 'Email address is required.',
    errExpired: 'Link expired. Please request a new one.',
  },
  ar: {
    title: 'نسيت كلمة المرور',
    subtitle: 'أدخل بريدك الإلكتروني لاستقبال رابط إعادة التعيين',
    emailLabel: 'البريد الإلكتروني', emailPlaceholder: 'انت@مدرسة.com',
    sendBtn: 'إرسال الرابط', sending: 'جارٍ الإرسال…',
    backToLogin: 'العودة إلى تسجيل الدخول',
    successTitle: 'تم إرسال البريد',
    successDesc: 'تم إرسال رابط إعادة التعيين إلى',
    successHint: 'تحقق من مجلد البريد العشوائي إذا لم تجده.',
    errRequired: 'البريد الإلكتروني مطلوب.',
    errExpired: 'الرابط منتهي الصلاحية. اطلب رابطاً جديداً.',
  },
}

export default function ForgotPasswordPage() {
  const { language }   = useSettingsStore()
  const searchParams   = useSearchParams()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (searchParams.get('error') === 'link_expired') {
      setError(ui.errExpired)
    }
  }, [searchParams, lang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) { setError(ui.errRequired); return }
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (authError) { setError(authError.message); return }
      setSent(true)
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-indigo-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-[420px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2.5 mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Attend<span className="text-blue-400">ify</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-white">{ui.title}</h1>
          <p className="text-sm text-slate-400 mt-1.5 px-4">{ui.subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">

          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-5">
              {/* Animated checkmark */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
                  <svg className="w-9 h-9 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">{ui.successTitle}</h2>
                <p className="text-slate-400 text-sm mt-1.5">
                  {ui.successDesc} <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              {/* Spam hint box */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-start gap-3">
                <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-300 text-left">{ui.successHint}</p>
              </div>

              <Link href="/auth/login"
                className={`inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}>
                <svg className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {ui.backToLogin}
              </Link>
            </div>

          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className={`block text-sm font-medium text-slate-300 mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {ui.emailLabel}
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRtl ? 'right-3.5' : 'left-3.5'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email" value={email} autoComplete="email"
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder={ui.emailPlaceholder}
                    className={`w-full bg-slate-800/60 border border-slate-700 rounded-2xl py-3 text-sm text-white
                      placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all duration-200
                      ${isRtl ? 'text-right pr-10 pl-4' : 'pl-10 pr-4'}
                      ${error ? 'border-red-500/50 focus:ring-red-500' : ''}`}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className={`flex items-center gap-2.5 bg-red-500/10 border border-red-500/20
                  rounded-2xl px-4 py-3 text-red-400 text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed
                  text-white font-semibold py-3 rounded-2xl transition-all duration-200
                  flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20
                  active:scale-[0.98]">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {ui.sending}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {ui.sendBtn}
                  </>
                )}
              </button>

              {/* Back link */}
              <div className="text-center pt-1">
                <Link href="/auth/login"
                  className={`inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <svg className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {ui.backToLogin}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}