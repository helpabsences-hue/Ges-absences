'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSettingsStore, type Theme, type Language } from '@/stores/useSettingsStore'
import EditProfileSection from '@/components/shared/EditProfileSection'
import { createClient } from '@/lib/supabase/client'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; desc: string; saved: string
  appearance: string; appearanceDesc: string
  dark: string; darkDesc: string; light: string; lightDesc: string
  language: string; languageDesc: string
  frenchDesc: string; englishDesc: string; arabicDesc: string
}> = {
  fr: {
    title: 'Paramètres', desc: 'Personnalisez votre expérience Attendify', saved: 'Préférences sauvegardées',
    appearance: 'Apparence', appearanceDesc: "Choisissez le thème de l'interface",
    dark: 'Sombre', darkDesc: 'Interface sombre, idéale pour la nuit',
    light: 'Clair', lightDesc: 'Interface claire et lumineuse',
    language: 'Langue', languageDesc: "Choisissez la langue de l'interface",
    frenchDesc: 'Interface en français', englishDesc: 'Interface in English', arabicDesc: 'واجهة باللغة العربية',
  },
  en: {
    title: 'Settings', desc: 'Customize your Attendify experience', saved: 'Preferences saved',
    appearance: 'Appearance', appearanceDesc: 'Choose the interface theme',
    dark: 'Dark', darkDesc: 'Dark interface, ideal for night use',
    light: 'Light', lightDesc: 'Bright and clear interface',
    language: 'Language', languageDesc: 'Choose the interface language',
    frenchDesc: 'Interface in French', englishDesc: 'Interface in English', arabicDesc: 'Interface in Arabic',
  },
  ar: {
    title: 'الإعدادات', desc: 'خصّص تجربتك في Attendify', saved: 'تم حفظ التفضيلات',
    appearance: 'المظهر', appearanceDesc: 'اختر مظهر الواجهة',
    dark: 'داكن', darkDesc: 'واجهة داكنة مثالية للاستخدام الليلي',
    light: 'فاتح', lightDesc: 'واجهة فاتحة ومضيئة',
    language: 'اللغة', languageDesc: 'اختر لغة الواجهة',
    frenchDesc: 'الواجهة بالفرنسية', englishDesc: 'الواجهة بالإنجليزية', arabicDesc: 'الواجهة بالعربية',
  },
}

export default function SettingsPage() {
  const { theme, language, setTheme, setLanguage } = useSettingsStore()

  const [saved,       setSaved]       = useState(false)
  const [threshold,   setThreshold]   = useState(3)
  const [threshSaved, setThreshSaved] = useState(false)
  const [threshLoad,  setThreshLoad]  = useState(false)
  const [schoolId,    setSchoolId]    = useState<string | null>(null)

  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  // Load school threshold on mount
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('school_id').eq('id', user.id).single()
      if (!profile?.school_id) return
      setSchoolId(profile.school_id)
      const { data: school } = await supabase
        .from('schools').select('absence_threshold').eq('id', profile.school_id).single()
      if (school?.absence_threshold) setThreshold(school.absence_threshold)
    }
    load()
  }, [])

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const handleTheme    = (v: Theme)    => { setTheme(v);    flash() }
  const handleLanguage = (v: Language) => { setLanguage(v); flash() }

  const saveThreshold = async () => {
    if (!schoolId) return
    setThreshLoad(true)
    const supabase = createClient()
    await supabase.from('schools')
      .update({ absence_threshold: threshold })
      .eq('id', schoolId)
    setThreshLoad(false)
    setThreshSaved(true)
    setTimeout(() => setThreshSaved(false), 2000)
  }

  return (
    <div className={`max-w-2xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* Header */}
      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{ui.desc}</p>
        </div>
        {saved && (
          <div className={`flex items-center gap-2 bg-green-500/10 border border-green-500/20
            text-green-400 text-xs font-medium px-3 py-2 rounded-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {ui.saved}
          </div>
        )}
      </div>

      {/* Appearance */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{ui.appearance}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{ui.appearanceDesc}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { val: 'dark'  as Theme, label: ui.dark,  desc: ui.darkDesc,
              preview: <div className="rounded-lg overflow-hidden border border-slate-700 mb-2 sm:mb-3"><div className="h-2 bg-slate-800"/><div className="bg-slate-950 p-2 space-y-1.5"><div className="h-1.5 w-3/4 bg-slate-700 rounded"/><div className="h-1.5 w-1/2 bg-slate-800 rounded"/></div></div> },
            { val: 'light' as Theme, label: ui.light, desc: ui.lightDesc,
              preview: <div className="rounded-lg overflow-hidden border border-slate-200 mb-2 sm:mb-3"><div className="h-2 bg-slate-200"/><div className="bg-white p-2 space-y-1.5"><div className="h-1.5 w-3/4 bg-slate-200 rounded"/><div className="h-1.5 w-1/2 bg-slate-100 rounded"/></div></div> },
          ]).map(({ val, label, desc, preview }) => (
            <button key={val} onClick={() => handleTheme(val)}
              className={`relative rounded-xl border-2 p-3 sm:p-4 text-left transition-all
                ${theme === val ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700'}`}>
              {theme === val && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
              )}
              {preview}
              <p className="text-xs sm:text-sm font-semibold text-white">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{ui.language}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{ui.languageDesc}</p>
        </div>
        <div className="space-y-2">
          {([
            { code: 'fr' as Language, flag: '🇫🇷', label: 'Français', desc: ui.frenchDesc  },
            { code: 'en' as Language, flag: '🇬🇧', label: 'English',  desc: ui.englishDesc },
            { code: 'ar' as Language, flag: '🇲🇦', label: 'العربية',  desc: ui.arabicDesc, rtl: true },
          ]).map(({ code, flag, label, desc, rtl }) => (
            <button key={code} onClick={() => handleLanguage(code)}
              className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl border-2 transition-all
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Absence Alert Threshold */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {lang === 'ar' ? 'تنبيهات الغياب' : lang === 'fr' ? "Alertes d'absences" : 'Absence Alerts'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'أرسل تنبيهاً لولي الأمر عند بلوغ هذا العدد من الغيابات'
              : lang === 'fr'
              ? "Envoyer une alerte aux parents quand l'étudiant atteint ce nombre d'absences"
              : 'Send an alert to parents when student reaches this number of absences'}
          </p>
        </div>

        <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
            <button
              onClick={() => setThreshold(t => Math.max(1, t - 1))}
              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition font-bold text-lg">
              −
            </button>
            <span className="text-xl font-bold text-white w-8 text-center">{threshold}</span>
            <button
              onClick={() => setThreshold(t => Math.min(20, t + 1))}
              className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition font-bold text-lg">
              +
            </button>
          </div>
          <span className="text-sm text-slate-400">
            {lang === 'ar' ? 'غياب' : 'absence(s)'}
          </span>
          <button
            onClick={saveThreshold}
            disabled={threshLoad}
            className="ml-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            {threshLoad
              ? '…'
              : threshSaved
              ? '✓ ' + (lang === 'ar' ? 'تم الحفظ' : lang === 'fr' ? 'Enregistré' : 'Saved')
              : lang === 'ar' ? 'حفظ' : lang === 'fr' ? 'Enregistrer' : 'Save'}
          </button>
        </div>

        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-xs text-amber-300">
            {lang === 'ar'
              ? 'سيتم إرسال البريد الإلكتروني تلقائياً إذا كان لولي الأمر عنوان بريد إلكتروني مسجل.'
              : lang === 'fr'
              ? "L'email sera envoyé automatiquement si le parent a une adresse email enregistrée dans la fiche étudiant."
              : 'Email will be sent automatically if the parent has an email address recorded in the student profile.'}
          </p>
        </div>
      </section>

      {/* Account — editable */}
      <EditProfileSection lang={lang} />

    </div>
  )
}