'use client'
// components/shared/Header.tsx

import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

type Lang = 'fr' | 'en' | 'ar'

// ── Inline translations — no t() dependency ───────────────
const PAGE_TITLES: Record<string, Record<Lang, string>> = {
  dashboard:   { fr: 'Tableau de Bord',    en: 'Dashboard',    ar: 'لوحة التحكم'       },
  teachers:    { fr: 'Enseignants',         en: 'Teachers',     ar: 'الأساتذة'           },
  students:    { fr: 'Étudiants',           en: 'Students',     ar: 'الطلاب'             },
  groups:      { fr: 'Groupes',             en: 'Groups',       ar: 'الفصول'             },
  fields:      { fr: 'Filières',            en: 'Fields',       ar: 'الشُّعَب'           },
  courses:     { fr: 'Matières',            en: 'Courses',      ar: 'المواد'             },
  planning:    { fr: 'Planning',            en: 'Planning',     ar: 'الجدول الزمني'       },
  reports:     { fr: 'Rapports',            en: 'Reports',      ar: 'التقارير'           },
  invitations: { fr: 'Invitations',         en: 'Invitations',  ar: 'الدعوات'            },
  settings:    { fr: 'Paramètres',          en: 'Settings',     ar: 'الإعدادات'          },
  teacher:     { fr: 'Mon Emploi du Temps', en: 'My Schedule',  ar: 'جدولي الدراسي'     },
}

const ROLE_LABELS: Record<string, Record<Lang, string>> = {
  super_admin: { fr: 'Super Admin',    en: 'Super Admin', ar: 'مدير عام'  },
  admin:       { fr: 'Administrateur', en: 'Admin',       ar: 'مدير'      },
  teacher:     { fr: 'Enseignant',     en: 'Teacher',     ar: 'أستاذ'     },
}

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  admin:       'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  teacher:     'bg-green-500/15 text-green-400 border border-green-500/20',
}

export default function Header() {
  const pathname     = usePathname()
  const { profile }  = useAuthStore()
  const { language } = useSettingsStore()

  const lang  = (language || 'fr') as Lang
  const isRtl = lang === 'ar'

  const segments  = pathname.split('/').filter(Boolean)
  const lastSeg   = segments[segments.length - 1] ?? 'dashboard'
  const pageTitle = PAGE_TITLES[lastSeg]?.[lang] ?? lastSeg

  const today = new Date().toLocaleDateString(
    lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  )

  const roleLabel = profile ? (ROLE_LABELS[profile.role]?.[lang] ?? profile.role) : ''
  const roleBadge = profile ? (ROLE_BADGE[profile.role] ?? '') : ''

  return (
    <header className={`h-14 sm:h-16 bg-slate-950 border-b border-slate-800 shrink-0
      px-3 sm:px-6 flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Spacer for mobile hamburger */}
      <div className="md:hidden w-9 shrink-0" />

      {/* Title + breadcrumb */}
      <div className={`flex flex-col justify-center flex-1 min-w-0 ${isRtl ? 'items-end' : 'items-start'}`}>
        <h1 className="text-sm sm:text-base md:text-lg font-semibold text-white leading-tight truncate">
          {pageTitle}
        </h1>
        <div className={`hidden sm:flex items-center gap-1 mt-0.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {segments.map((seg, i) => {
            const isLast = i === segments.length - 1
            const label  = PAGE_TITLES[seg]?.[lang] ?? seg
            return (
              <span key={seg} className={`flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <span className={`text-xs ${isLast ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
                {!isLast && (
                  <svg className={`w-3 h-3 text-slate-700 shrink-0 ${isRtl ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </span>
            )
          })}
        </div>
      </div>

      {/* Date */}
      <span className="hidden lg:block text-xs text-slate-500 capitalize shrink-0 max-w-[180px] truncate">
        {today}
      </span>

      {/* Profile */}
      {profile && (
        <div className={`flex items-center gap-2 sm:gap-2.5 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>

          {/* Name + role badge — visible sm+ */}
          <div className={`hidden sm:flex flex-col ${isRtl ? 'items-start' : 'items-end'}`}>
            <p className="text-xs sm:text-sm font-medium text-white leading-tight truncate max-w-[140px]">
              {profile.name}
            </p>
            <span className={`inline-flex items-center text-[10px] sm:text-xs font-semibold
              px-1.5 py-0.5 rounded-md mt-0.5 ${roleBadge}`}>
              {roleLabel}
            </span>
          </div>

          {/* Avatar */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500/20 border border-blue-500/30
            flex items-center justify-center shrink-0">
            <span className="text-xs sm:text-sm font-bold text-blue-400">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
