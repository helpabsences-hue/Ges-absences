'use client'
// app/auth/reset-password/page.tsx

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSettingsStore } from '@/stores/useSettingsStore'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  subtitle: string
  newPassword: string; confirmPassword: string
  updateBtn: string; updating: string
  successTitle: string; successDesc: string; goToLogin: string
  errRequired: string; errMatch: string; errMin: string
  errExpired: string; show: string; hide: string
  strength: string; weak: string; fair: string; good: string; strong: string
  loading: string
}> = {
  fr: {
    subtitle: 'Choisissez un nouveau mot de passe',
    newPassword: 'Nouveau mot de passe', confirmPassword: 'Confirmer le mot de passe',
    updateBtn: 'Mettre à jour', updating: 'Mise à jour…',
    successTitle: 'Mot de passe mis à jour !', successDesc: 'Redirection en cours…',
    goToLogin: 'Se connecter',
    errRequired: 'Ce champ est obligatoire.', errMatch: 'Les mots de passe ne correspondent pas.',
    errMin: 'Minimum 8 caractères.', errExpired: 'Lien expiré. Demandez un nouveau lien.',
    show: 'Voir', hide: 'Masquer',
    strength: 'Force :', weak: 'Faible', fair: 'Moyen', good: 'Bon', strong: 'Fort',
    loading: 'Vérification du lien…',
  },
  en: {
    subtitle: 'Choose a new secure password',
    newPassword: 'New password', confirmPassword: 'Confirm password',
    updateBtn: 'Update Password', updating: 'Updating…',
    successTitle: 'Password updated!', successDesc: 'Redirecting…',
    goToLogin: 'Go to login',
    errRequired: 'This field is required.', errMatch: 'Passwords do not match.',
    errMin: 'Minimum 8 characters.', errExpired: 'Link expired. Request a new one.',
    show: 'Show', hide: 'Hide',
    strength: 'Strength:', weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong',
    loading: 'Verifying link…',
  },
  ar: {
    subtitle: 'اختر كلمة مرور جديدة وآمنة',
    newPassword: 'كلمة المرور الجديدة', confirmPassword: 'تأكيد كلمة المرور',
    updateBtn: 'تحديث', updating: 'جارٍ التحديث…',
    successTitle: 'تم تحديث كلمة المرور!', successDesc: 'جارٍ التوجيه…',
    goToLogin: 'تسجيل الدخول',
    errRequired: 'هذا الحقل مطلوب.', errMatch: 'كلمتا المرور غير متطابقتين.',
    errMin: 'الحد الأدنى 8 أحرف.', errExpired: 'الرابط منتهي الصلاحية. اطلب رابطاً جديداً.',
    show: 'إظهار', hide: 'إخفاء',
    strength: 'القوة:', weak: 'ضعيفة', fair: 'متوسطة', good: 'جيدة', strong: 'قوية',
    loading: 'جارٍ التحقق من الرابط…',
  },
}

function strength(p: string): 0|1|2|3|4 {
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) s++
  return Math.min(s, 4) as 0|1|2|3|4
}
const STRENGTH_COLOR = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500']

type PageState = 'loading' | 'ready' | 'expired' | 'done'

export default function ResetPasswordPage() {
  const router       = useRouter()
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [pageState, setPageState] = useState<PageState>('loading')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const pwdStrength = strength(password)
  const strengthLabel = ['', ui.weak, ui.fair, ui.good, ui.strong][pwdStrength]

  useEffect(() => {
    // Supabase puts tokens in the URL hash: #access_token=...&type=recovery
    // We need to let Supabase process the hash and establish a session
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        // Token exchanged successfully — show the form
        setPageState('ready')
      } else if (event === 'SIGNED_IN' && session) {
        // Also handles when session is already active
        setPageState('ready')
      }
    })

    // Also try to get current session in case already exchanged
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && pageState === 'loading') {
        setPageState('ready')
      }
    })

    // If after 5 seconds no session, link is expired
    const timeout = setTimeout(() => {
      setPageState(prev => prev === 'loading' ? 'expired' : prev)
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password)            { setError(ui.errRequired); return }
    if (password.length < 8)  { setError(ui.errMin);      return }
    if (password !== confirm)  { setError(ui.errMatch);    return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) { setError(updateError.message); return }

    setPageState('done')
    setTimeout(() => router.push('/auth/login'), 2500)
  }

  // ── Logo ──────────────────────────────────────────────
  const Logo = () => (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2 mb-3">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">
          Attend<span className="text-blue-400">ify</span>
        </span>
      </div>
      <p className="text-slate-400 text-sm">{ui.subtitle}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Logo />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* ── Loading ── */}
          {pageState === 'loading' && (
            <div className="text-center py-6 space-y-3">
              <svg className="w-8 h-8 text-blue-400 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-400 text-sm">{ui.loading}</p>
            </div>
          )}

          {/* ── Expired ── */}
          {pageState === 'expired' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-white font-semibold">{ui.errExpired}</p>
              <Link href="/auth/forgot-password"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
                ← {lang === 'ar' ? 'طلب رابط جديد' : lang === 'fr' ? 'Demander un nouveau lien' : 'Request new link'}
              </Link>
            </div>
          )}

          {/* ── Success ── */}
          {pageState === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-lg">{ui.successTitle}</p>
                <p className="text-slate-400 text-sm mt-1 animate-pulse">{ui.successDesc}</p>
              </div>
              <Link href="/auth/login"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
                {ui.goToLogin}
              </Link>
            </div>
          )}

          {/* ── Form ── */}
          {pageState === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{ui.newPassword}</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="••••••••"
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                      placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                      ${isRtl ? 'text-right pr-4 pl-16' : 'pr-16'}`}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className={`absolute top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white transition
                      ${isRtl ? 'left-3' : 'right-3'}`}>
                    {showPwd ? ui.hide : ui.show}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all
                          ${i <= pwdStrength ? STRENGTH_COLOR[pwdStrength] : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      {ui.strength} <span className={`font-medium ${
                        pwdStrength <= 1 ? 'text-red-400' : pwdStrength === 2 ? 'text-orange-400' :
                        pwdStrength === 3 ? 'text-yellow-400' : 'text-green-400'
                      }`}>{strengthLabel}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{ui.confirmPassword}</label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder="••••••••"
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white
                      placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                      ${isRtl ? 'text-right pr-4 pl-16' : 'pr-16'}
                      ${confirm && confirm !== password ? 'border-red-500/50' : ''}
                      ${confirm && confirm === password ? 'border-green-500/50' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className={`absolute top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white transition
                      ${isRtl ? 'left-3' : 'right-3'}`}>
                    {showConf ? ui.hide : ui.show}
                  </button>
                  {confirm.length > 0 && (
                    <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-10' : 'right-10'}`}>
                      {confirm === password
                        ? <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        : <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      }
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                  text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {ui.updating}
                  </>
                ) : ui.updateBtn}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
