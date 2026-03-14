'use client'
// app/dashboard/settings/page.tsx

import { useState } from 'react'
import { useSettingsStore, type Theme, type Language } from '@/stores/useSettingsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { t } from '@/lib/i18n'

const ROLE_LABELS: Record<string, Record<string, string>> = {
  fr: { super_admin: 'Super Admin', admin: 'Administrateur', teacher: 'Enseignant' },
  en: { super_admin: 'Super Admin', admin: 'Administrator',  teacher: 'Teacher'     },
  ar: { super_admin: 'مدير عام',    admin: 'مدير',           teacher: 'أستاذ'       },
}

export default function SettingsPage() {
  const { theme, language, setTheme, setLanguage } = useSettingsStore()
  const { profile } = useAuthStore()
  const [saved, setSaved] = useState(false)

  const lang = language as 'fr' | 'en' | 'ar'

  const handleTheme = (val: Theme) => {
    setTheme(val)
    flash()
  }

  const handleLanguage = (val: Language) => {
    setLanguage(val)
    flash()
  }

  const flash = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{t(lang, 'settings')}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{t(lang, 'settingsDesc')}</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium px-3 py-2 rounded-xl">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {t(lang, 'saved')}
          </div>
        )}
      </div>

      {/* ── Appearance ─────────────────────────────────── */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{t(lang, 'appearance')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t(lang, 'appearanceDesc')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Dark */}
          <button
            onClick={() => handleTheme('dark')}
            className={`relative rounded-xl border-2 p-4 text-left transition-all ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {theme === 'dark' && (
              <span className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {/* Dark preview */}
            <div className="rounded-lg overflow-hidden border border-slate-700 mb-3">
              <div className="h-2 bg-slate-800" />
              <div className="bg-slate-950 p-2 space-y-1.5">
                <div className="h-1.5 w-3/4 bg-slate-700 rounded" />
                <div className="h-1.5 w-1/2 bg-slate-800 rounded" />
                <div className="h-1.5 w-2/3 bg-slate-700 rounded" />
              </div>
            </div>
            <p className="text-sm font-semibold text-white">{t(lang, 'dark')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t(lang, 'darkDesc')}</p>
          </button>

          {/* Light */}
          <button
            onClick={() => handleTheme('light')}
            className={`relative rounded-xl border-2 p-4 text-left transition-all ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {theme === 'light' && (
              <span className="absolute top-3 right-3 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {/* Light preview */}
            <div className="rounded-lg overflow-hidden border border-slate-200 mb-3">
              <div className="h-2 bg-slate-200" />
              <div className="bg-white p-2 space-y-1.5">
                <div className="h-1.5 w-3/4 bg-slate-200 rounded" />
                <div className="h-1.5 w-1/2 bg-slate-100 rounded" />
                <div className="h-1.5 w-2/3 bg-slate-200 rounded" />
              </div>
            </div>
            <p className="text-sm font-semibold text-white">{t(lang, 'light')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t(lang, 'lightDesc')}</p>
          </button>
        </div>
      </section>

      {/* ── Language ───────────────────────────────────── */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{t(lang, 'language')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t(lang, 'languageDesc')}</p>
        </div>

        <div className="space-y-2">
          {([
            { code: 'fr', flag: '🇫🇷', label: 'Français',   desc: t(lang, 'frenchDesc')  },
            { code: 'en', flag: '🇬🇧', label: 'English',    desc: t(lang, 'englishDesc') },
            { code: 'ar', flag: '🇲🇦', label: 'العربية',    desc: t(lang, 'arabicDesc'),  rtl: true },
          ] as { code: Language; flag: string; label: string; desc: string; rtl?: boolean }[]).map(({ code, flag, label, desc, rtl }) => (
            <button
              key={code}
              onClick={() => handleLanguage(code)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
                language === code
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-2xl shrink-0">{flag}</span>
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

      {/* ── Account info ───────────────────────────────── */}
      {profile && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">{t(lang, 'account')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t(lang, 'accountDesc')}</p>
          </div>

          <div className="space-y-3">
            {[
              { label: t(lang, 'name'),  value: profile.name  },
              { label: t(lang, 'email'), value: profile.email },
              { label: t(lang, 'role'),  value: ROLE_LABELS[lang]?.[profile.role] ?? profile.role },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
                <span className="text-sm text-white font-medium">{value}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
