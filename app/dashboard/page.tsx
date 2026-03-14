'use client'
// app/dashboard/page.tsx

import { AdminStats }       from '@/components/analytics/admin-stats'
import { AttendanceChart }  from '@/components/analytics/attendance-chart'
import { RecentAlerts }     from '@/components/analytics/recent-alert'
import { useSettingsStore } from '@/stores/useSettingsStore'

const TITLES: Record<string, string>   = { fr: 'Tableau de Bord',  en: 'Dashboard',        ar: 'لوحة التحكم'      }
const DESCS:  Record<string, string>   = { fr: "Vue d'ensemble du système", en: 'System overview', ar: 'نظرة عامة على النظام' }
const ALERT_TITLES: Record<string, string> = { fr: 'Alertes Récentes', en: 'Recent Alerts',    ar: 'التنبيهات الأخيرة' }
const ALERT_SUBS:   Record<string, string> = { fr: 'Absences et retards', en: 'Absences and lates', ar: 'الغيابات والتأخيرات' }

export default function DashboardPage() {
  const { language } = useSettingsStore()
  const lang = (language || 'fr') as 'fr' | 'en' | 'ar'

  return (
    <div className="flex flex-col h-full p-3 sm:p-4 md:p-6 w-full space-y-4 md:space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl dark:text-white font-bold text-foreground">
          {TITLES[lang]}
        </h1>
        <p className="text-xs sm:text-sm dark:text-white text-muted-foreground mt-1">
          {DESCS[lang]}
        </p>
      </div>

      {/* Stat cards */}
      <AdminStats lang={lang} />

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        <div className="lg:col-span-2">
          <AttendanceChart lang={lang} />
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-[280px] lg:min-h-0">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              {ALERT_TITLES[lang]}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ALERT_SUBS[lang]}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            <RecentAlerts lang={lang} />
          </div>
        </div>

      </div>
    </div>
  )
}
