'use client'

export const dynamic = 'force-dynamic'
// app/auth/parent-register/[schoolId]/page.tsx — public page: parent creates an account
// with the Massar code + date of birth of each child

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSettingsStore, initUserSettings } from '@/stores/useSettingsStore'
import { LogoIcon } from '@/components/shared/LogoIcon'

type Lang = 'fr' | 'en' | 'ar'
type Step = 'children' | 'parent' | 'done'
interface ChildRow { massar_code: string; date_of_birth: string }

const UI = {
  fr: {
    title: 'Espace parent', subtitle: 'Créez votre compte pour suivre la scolarité de vos enfants',
    step1: 'Vos enfants', step2: 'Vos informations',
    child: 'Enfant', massar: 'Code Massar', dob: 'Date de naissance',
    addChild: '+ Ajouter un autre enfant', remove: 'Retirer',
    next: 'Continuer', back: 'Retour', checking: 'Vérification…',
    found: 'Élèves trouvés',
    name: 'Nom complet', phone: 'Téléphone', email: 'Email', password: 'Mot de passe', confirm: 'Confirmer le mot de passe',
    pwdHint: 'Minimum 8 caractères',
    create: 'Créer mon compte', creating: 'Création…',
    doneNew: 'Compte créé ! Ouverture de votre espace…',
    doneExisting: 'Vos enfants ont été ajoutés à votre compte existant. Connectez-vous avec votre mot de passe habituel.',
    login: 'Se connecter', haveAccount: 'Vous avez déjà un compte ?',
    errors: {
      school: 'Lien invalide. Demandez un nouveau lien à l\'école.',
      notFound: 'Code Massar ou date de naissance incorrect pour l\'enfant',
      tooMany: 'Trop de tentatives. Réessayez dans une heure.',
      invalid: 'Vérifiez les codes Massar et les dates (pas de doublon).',
      name: 'Entrez votre nom complet.', phone: 'Numéro de téléphone invalide.', email: 'Email invalide.',
      password: 'Le mot de passe doit contenir au moins 8 caractères.', mismatch: 'Les mots de passe ne correspondent pas.',
      linked: 'Cet enfant est déjà lié à un autre compte parent. Contactez l\'école. Enfant',
      staffEmail: 'Cet email est utilisé par un compte de l\'école. Utilisez un autre email.',
      emailTaken: 'Cet email a déjà un compte. Connectez-vous ou utilisez un autre email.',
      server: 'Erreur serveur. Réessayez.',
    },
  },
  en: {
    title: 'Parent space', subtitle: 'Create your account to follow your children at school',
    step1: 'Your children', step2: 'Your information',
    child: 'Child', massar: 'Massar code', dob: 'Date of birth',
    addChild: '+ Add another child', remove: 'Remove',
    next: 'Continue', back: 'Back', checking: 'Checking…',
    found: 'Students found',
    name: 'Full name', phone: 'Phone', email: 'Email', password: 'Password', confirm: 'Confirm password',
    pwdHint: 'At least 8 characters',
    create: 'Create my account', creating: 'Creating…',
    doneNew: 'Account created! Opening your space…',
    doneExisting: 'Your children were added to your existing account. Sign in with your usual password.',
    login: 'Sign in', haveAccount: 'Already have an account?',
    errors: {
      school: 'Invalid link. Ask the school for a new link.',
      notFound: 'Wrong Massar code or date of birth for child',
      tooMany: 'Too many attempts. Try again in one hour.',
      invalid: 'Check the Massar codes and dates (no duplicates).',
      name: 'Enter your full name.', phone: 'Invalid phone number.', email: 'Invalid email.',
      password: 'Password must be at least 8 characters.', mismatch: 'Passwords do not match.',
      linked: 'This child is already linked to another parent account. Contact the school. Child',
      staffEmail: 'This email is used by a school account. Use another email.',
      emailTaken: 'This email already has an account. Sign in or use another email.',
      server: 'Server error. Please try again.',
    },
  },
  ar: {
    title: 'فضاء الآباء', subtitle: 'أنشئ حسابك لتتبع تمدرس أبنائك',
    step1: 'أبناؤك', step2: 'معلوماتك',
    child: 'الابن', massar: 'رمز مسار', dob: 'تاريخ الازدياد',
    addChild: '+ إضافة ابن آخر', remove: 'حذف',
    next: 'متابعة', back: 'رجوع', checking: 'جارٍ التحقق…',
    found: 'التلاميذ الذين تم العثور عليهم',
    name: 'الاسم الكامل', phone: 'الهاتف', email: 'البريد الإلكتروني', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور',
    pwdHint: '8 أحرف على الأقل',
    create: 'إنشاء حسابي', creating: 'جارٍ الإنشاء…',
    doneNew: 'تم إنشاء الحساب! جارٍ فتح فضائك…',
    doneExisting: 'تمت إضافة أبنائك إلى حسابك الحالي. سجّل الدخول بكلمة المرور المعتادة.',
    login: 'تسجيل الدخول', haveAccount: 'لديك حساب بالفعل؟',
    errors: {
      school: 'رابط غير صالح. اطلب رابطاً جديداً من المؤسسة.',
      notFound: 'رمز مسار أو تاريخ الازدياد غير صحيح للابن',
      tooMany: 'محاولات كثيرة. حاول مجدداً بعد ساعة.',
      invalid: 'تحقق من رموز مسار والتواريخ (بدون تكرار).',
      name: 'أدخل اسمك الكامل.', phone: 'رقم الهاتف غير صالح.', email: 'البريد الإلكتروني غير صالح.',
      password: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.', mismatch: 'كلمتا المرور غير متطابقتين.',
      linked: 'هذا الابن مرتبط بحساب ولي أمر آخر. تواصل مع المؤسسة. الابن',
      staffEmail: 'هذا البريد مستعمل في حساب تابع للمؤسسة. استعمل بريداً آخر.',
      emailTaken: 'هذا البريد لديه حساب. سجّل الدخول أو استعمل بريداً آخر.',
      server: 'خطأ في الخادم. حاول مجدداً.',
    },
  },
} as const

type ErrKey = keyof typeof UI.fr.errors

export default function ParentRegisterPage() {
  const { schoolId }  = useParams<{ schoolId: string }>()
  const { language, setLanguage } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [schoolName, setSchoolName] = useState<string | null>(null)
  const [badLink, setBadLink]       = useState(false)
  const [step, setStep]             = useState<Step>('children')
  const [rows, setRows]             = useState<ChildRow[]>([{ massar_code: '', date_of_birth: '' }])
  const [found, setFound]           = useState<{ name: string; group: string }[]>([])
  const [parent, setParent]         = useState({ name: '', phone: '', email: '', password: '', confirm: '' })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [existing, setExisting]     = useState(false)

  useEffect(() => {
    fetch(`/api/parent-register?school=${encodeURIComponent(schoolId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setSchoolName(d.name))
      .catch(() => setBadLink(true))
  }, [schoolId])

  const errorText = (d: { error?: string; index?: number }) => {
    const key = (d.error ?? 'server') as ErrKey
    const base = ui.errors[key] ?? ui.errors.server
    return typeof d.index === 'number' && (key === 'notFound' || key === 'linked') ? `${base} ${d.index + 1}.` : base
  }

  const callApi = async (action: 'verify' | 'register') => {
    const res = await fetch('/api/parent-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action, school_id: schoolId,
        children: rows.map(r => ({ massar_code: r.massar_code.trim(), date_of_birth: r.date_of_birth })),
        parent_name: parent.name, parent_phone: parent.phone, parent_email: parent.email, password: parent.password,
      }),
    })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (rows.some(r => !r.massar_code.trim() || !r.date_of_birth)) { setError(ui.errors.invalid); return }
    setLoading(true)
    const { ok, data } = await callApi('verify')
    setLoading(false)
    if (!ok) { setError(errorText(data)); return }
    setFound(data.children ?? [])
    setStep('parent')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (parent.name.trim().length < 2)     { setError(ui.errors.name); return }
    if (parent.password.length < 8)        { setError(ui.errors.password); return }
    if (parent.password !== parent.confirm) { setError(ui.errors.mismatch); return }
    setLoading(true)
    const { ok, data } = await callApi('register')
    if (!ok) { setLoading(false); setError(errorText(data)); return }

    if (data.existing) { setExisting(true); setStep('done'); setLoading(false); return }

    // New account → sign in and open the parent portal
    setStep('done')
    const supabase = createClient()
    const { data: auth } = await supabase.auth.signInWithPassword({
      email: parent.email.trim().toLowerCase(), password: parent.password,
    })
    if (auth.user) { initUserSettings(auth.user.id); window.location.href = '/parent' }
    else window.location.href = '/auth/login'
  }

  const inputCls = `w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRtl ? 'text-right' : ''}`
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5'

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-start sm:items-center justify-center px-4 py-8" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg">

        {/* Language */}
        <div className="flex justify-end gap-1 mb-4" dir="ltr">
          {(['fr', 'en', 'ar'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLanguage(l)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${lang === l ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {l === 'ar' ? 'ع' : l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2" dir="ltr">
            <LogoIcon className="w-9 h-9" />
            <span className="text-2xl font-bold text-white">Attend<span className="text-blue-400">efy</span></span>
          </div>
          <h1 className="text-lg font-semibold text-white">{ui.title}{schoolName ? ` — ${schoolName}` : ''}</h1>
          <p className="text-slate-400 text-sm mt-1">{ui.subtitle}</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 shadow-2xl">
          {badLink ? (
            <p className="text-center text-red-400 text-sm py-6">{ui.errors.school}</p>
          ) : schoolName === null ? (
            <div className="flex justify-center py-10 text-blue-400"><Spinner /></div>
          ) : step === 'done' ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p className="text-white text-sm">{existing ? ui.doneExisting : ui.doneNew}</p>
              {existing && (
                <a href="/auth/login" className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                  {ui.login}
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Steps */}
              <div className="flex items-center gap-2 mb-5 text-xs">
                {[ui.step1, ui.step2].map((s, i) => {
                  const active = (i === 0 && step === 'children') || (i === 1 && step === 'parent')
                  return (
                    <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0 ${active ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>{i + 1}</span>
                      <span className={`truncate ${active ? 'text-white font-medium' : 'text-slate-500'}`}>{s}</span>
                    </div>
                  )
                })}
              </div>

              {step === 'children' ? (
                <form onSubmit={handleVerify} className="space-y-4">
                  {rows.map((r, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-300">{ui.child} {i + 1}</p>
                        {rows.length > 1 && (
                          <button type="button" onClick={() => setRows(rs => rs.filter((_, k) => k !== i))}
                            className="text-xs text-slate-500 hover:text-red-400 transition">{ui.remove}</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>{ui.massar}</label>
                          <input value={r.massar_code} dir="ltr" placeholder="G123456789"
                            onChange={e => setRows(rs => rs.map((x, k) => k === i ? { ...x, massar_code: e.target.value.toUpperCase().replace(/\s/g, '') } : x))}
                            className={`${inputCls} font-mono`} />
                        </div>
                        <div>
                          <label className={labelCls}>{ui.dob}</label>
                          <input type="date" value={r.date_of_birth}
                            onChange={e => setRows(rs => rs.map((x, k) => k === i ? { ...x, date_of_birth: e.target.value } : x))}
                            className={inputCls} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {rows.length < 6 && (
                    <button type="button" onClick={() => setRows(rs => [...rs, { massar_code: '', date_of_birth: '' }])}
                      className="w-full border border-dashed border-white/15 hover:border-blue-500/50 text-blue-400 text-sm font-medium py-2.5 rounded-xl transition">
                      {ui.addChild}
                    </button>
                  )}

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                    {loading && <Spinner />}{loading ? ui.checking : ui.next}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Children confirmed */}
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-green-400">{ui.found}</p>
                    {found.map((c, i) => (
                      <p key={i} className="text-sm text-white">✓ {c.name}{c.group && <span className="text-slate-400 text-xs"> · {c.group}</span>}</p>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={labelCls}>{ui.name}</label>
                      <input value={parent.name} onChange={e => setParent(p => ({ ...p, name: e.target.value }))} className={inputCls} autoComplete="name" />
                    </div>
                    <div>
                      <label className={labelCls}>{ui.phone}</label>
                      <input type="tel" dir="ltr" value={parent.phone} placeholder="06XX XXX XXX"
                        onChange={e => setParent(p => ({ ...p, phone: e.target.value }))} className={inputCls} autoComplete="tel" />
                    </div>
                    <div>
                      <label className={labelCls}>{ui.email}</label>
                      <input type="email" dir="ltr" value={parent.email} placeholder="parent@email.com"
                        onChange={e => setParent(p => ({ ...p, email: e.target.value }))} className={inputCls} autoComplete="email" />
                    </div>
                    <div>
                      <label className={labelCls}>{ui.password}</label>
                      <input type="password" value={parent.password} placeholder="••••••••"
                        onChange={e => setParent(p => ({ ...p, password: e.target.value }))} className={inputCls} autoComplete="new-password" />
                      <p className="text-[11px] text-slate-500 mt-1">{ui.pwdHint}</p>
                    </div>
                    <div>
                      <label className={labelCls}>{ui.confirm}</label>
                      <input type="password" value={parent.confirm} placeholder="••••••••"
                        onChange={e => setParent(p => ({ ...p, confirm: e.target.value }))} className={inputCls} autoComplete="new-password" />
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setStep('children'); setError('') }}
                      className="px-4 py-3 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition">{ui.back}</button>
                    <button type="submit" disabled={loading}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                      {loading && <Spinner />}{loading ? ui.creating : ui.create}
                    </button>
                  </div>
                </form>
              )}

              <p className="text-center text-xs text-slate-500 mt-5">
                {ui.haveAccount} <a href="/auth/login" className="text-blue-400 hover:text-blue-300">{ui.login}</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}