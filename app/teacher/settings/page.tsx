'use client'

export const dynamic = 'force-dynamic'
// app/teacher/settings/page.tsx
// Same settings as admin — theme, language, account info

import { useState } from 'react'
import Link from 'next/link'
import EditProfileSection from '@/components/shared/EditProfileSection'
import { useSettingsStore, type Theme, type Language } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; desc: string
  appearance: string; appearanceDesc: string
  dark: string; darkDesc: string
  light: string; lightDesc: string
  language: string; languageDesc: string
  frenchDesc: string; englishDesc: string; arabicDesc: string
  account: string; accountDesc: string
  nameLabel: string; emailLabel: string; roleLabel: string
  saved: string
}> = {
  fr: {
    title: 'Paramètres', desc: 'Personnalisez votre expérience Attendify',
    appearance: 'Apparence', appearanceDesc: "Choisissez le thème de l'interface",
    dark: 'Sombre', darkDesc: 'Interface sombre, idéale pour la nuit',
    light: 'Clair', lightDesc: 'Interface claire et lumineuse',
    language: 'Langue', languageDesc: "Choisissez la langue de l'interface",
    frenchDesc: 'Interface en français', englishDesc: 'Interface in English', arabicDesc: 'واجهة باللغة العربية',
    account: 'Compte', accountDesc: 'Informations de votre compte',
    nameLabel: 'Nom', emailLabel: 'Email', roleLabel: 'Rôle',
    saved: 'Préférences sauvegardées',
  },
  en: {
    title: 'Settings', desc: 'Customize your Attendify experience',
    appearance: 'Appearance', appearanceDesc: 'Choose the interface theme',
    dark: 'Dark', darkDesc: 'Dark interface, ideal for night use',
    light: 'Light', lightDesc: 'Bright and clear interface',
    language: 'Language', languageDesc: 'Choose the interface language',
    frenchDesc: 'Interface in French', englishDesc: 'Interface in English', arabicDesc: 'Interface in Arabic',
    account: 'Account', accountDesc: 'Your account information',
    nameLabel: 'Name', emailLabel: 'Email', roleLabel: 'Role',
    saved: 'Preferences saved',
  },
  ar: {
    title: 'الإعدادات', desc: 'خصّص تجربتك في Attendify',
    appearance: 'المظهر', appearanceDesc: 'اختر مظهر الواجهة',
    dark: 'داكن', darkDesc: 'واجهة داكنة مثالية للاستخدام الليلي',
    light: 'فاتح', lightDesc: 'واجهة فاتحة ومضيئة',
    language: 'اللغة', languageDesc: 'اختر لغة الواجهة',
    frenchDesc: 'الواجهة بالفرنسية', englishDesc: 'الواجهة بالإنجليزية', arabicDesc: 'الواجهة بالعربية',
    account: 'الحساب', accountDesc: 'معلومات حسابك',
    nameLabel: 'الاسم', emailLabel: 'البريد الإلكتروني', roleLabel: 'الدور',
    saved: 'تم حفظ التفضيلات',
  },
}

const ROLE_LABELS: Record<Lang, Record<string, string>> = {
  fr: { super_admin: 'Super Admin', admin: 'Administrateur', teacher: 'Enseignant' },
  en: { super_admin: 'Super Admin', admin: 'Administrator',  teacher: 'Teacher'    },
  ar: { super_admin: 'مدير عام',    admin: 'مدير',           teacher: 'أستاذ'      },
}

export default function TeacherSettingsPage() {
  const { theme, language, setTheme, setLanguage } = useSettingsStore()
  const { profile } = useAuthStore()
  const [saved, setSaved] = useState(false)

  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const handleTheme    = (v: Theme)    => { setTheme(v);    flash() }
  const handleLanguage = (v: Language) => { setLanguage(v); flash() }

  return (
    <div className={`max-w-2xl mx-auto space-y-4 sm:space-y-6 p-4 sm:p-6 ${isRtl ? 'text-right' : ''}`}>

      {/* Header */}
      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {/* Back to home */}
          <Link href="/teacher"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white
              bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl transition shrink-0">
            <svg className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {lang === 'ar' ? 'رجوع' : lang === 'fr' ? 'Retour' : 'Back'}
          </Link>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{ui.desc}</p>
          </div>
        </div>
        {saved && (
          <div className={`flex items-center gap-2 bg-green-500/10 border border-green-500/20
            text-green-400 text-xs font-medium px-3 py-2 rounded-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {ui.saved}
          </div>
        )}
      </div>

      {/* ── Appearance ─────────────────────────────────── */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{ui.appearance}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{ui.appearanceDesc}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Dark */}
          <button onClick={() => handleTheme('dark')}
            className={`relative rounded-xl border-2 p-3 sm:p-4 text-left transition-all
              ${theme === 'dark' ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700'}`}>
            {theme === 'dark' && (
              <span className="absolute top-2 right-2 sm:top-3 sm:right-3 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <div className="rounded-lg overflow-hidden border border-slate-700 mb-2 sm:mb-3">
              <div className="h-2 bg-slate-800" />
              <div className="bg-slate-950 p-2 space-y-1.5">
                <div className="h-1.5 w-3/4 bg-slate-700 rounded" />
                <div className="h-1.5 w-1/2 bg-slate-800 rounded" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white">{ui.dark}</p>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{ui.darkDesc}</p>
          </button>

          {/* Light */}
          <button onClick={() => handleTheme('light')}
            className={`relative rounded-xl border-2 p-3 sm:p-4 text-left transition-all
              ${theme === 'light' ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700'}`}>
            {theme === 'light' && (
              <span className="absolute top-2 right-2 sm:top-3 sm:right-3 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <div className="rounded-lg overflow-hidden border border-slate-200 mb-2 sm:mb-3">
              <div className="h-2 bg-slate-200" />
              <div className="bg-white p-2 space-y-1.5">
                <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                <div className="h-1.5 w-1/2 bg-slate-100 rounded" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white">{ui.light}</p>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{ui.lightDesc}</p>
          </button>
        </div>
      </section>

      {/* ── Language ───────────────────────────────────── */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{ui.language}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{ui.languageDesc}</p>
        </div>
        <div className="space-y-2">
          {([
            { code: 'fr' as Language, flag: '🇫🇷', label: 'Français',  desc: ui.frenchDesc  },
            { code: 'en' as Language, flag: '🇬🇧', label: 'English',   desc: ui.englishDesc },
            { code: 'ar' as Language, flag: '🇲🇦', label: 'العربية',   desc: ui.arabicDesc, rtl: true },
          ]).map(({ code, flag, label, desc, rtl }) => (
            <button key={code} onClick={() => handleLanguage(code)}
              className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl border-2 transition-all
                ${isRtl ? 'flex-row-reverse' : ''}
                ${language === code ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700'}`}>
              <span className="text-xl sm:text-2xl shrink-0">{flag}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold text-white ${rtl ? 'text-right' : ''}`}>{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
              </div>
              {language === code && (
                <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Account — editable ──────────────────────── */}
      <EditProfileSection lang={lang} />
    </div>
  )
}
