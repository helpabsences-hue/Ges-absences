'use client'
// components/analytics/recent-alerts.tsx

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Clock } from 'lucide-react'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, { noAlerts: string; everyonePresent: string; absent: string; late: string }> = {
  fr: { noAlerts: 'Aucune alerte',    everyonePresent: 'Tout le monde est présent', absent: 'ABSENT',  late: 'RETARD'   },
  en: { noAlerts: 'No alerts',        everyonePresent: 'Everyone is present',        absent: 'ABSENT',  late: 'LATE'     },
  ar: { noAlerts: 'لا توجد تنبيهات', everyonePresent: 'الجميع حاضر',               absent: 'غائب',    late: 'متأخر'   },
}

interface Alert {
  id: string; studentName: string; groupName: string
  courseName: string; date: string; status: 'absent' | 'late'
}

export function RecentAlerts({ lang = 'fr' }: { lang?: Lang }) {
  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const ui = UI[lang]
  const dateLocale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR'

  useEffect(() => {
    const fetchAlerts = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('attendance')
        .select(`id, status,
          students ( name, groups ( name ) ),
          class_sessions!inner ( session_date, teacher_planning ( courses ( name ) ) )
        `)
        .in('status', ['absent', 'late'])
        .order('class_sessions(session_date)', { ascending: false })
        .limit(8)

      setAlerts((data ?? []).map((r: any) => ({
        id:          r.id,
        studentName: r.students?.name ?? '—',
        groupName:   r.students?.groups?.name ?? '—',
        courseName:  r.class_sessions?.teacher_planning?.courses?.name ?? '—',
        date:        r.class_sessions?.session_date ?? '',
        status:      r.status,
      })))
      setLoading(false)
    }
    fetchAlerts()
  }, [])

  if (loading) {
    return (
      <div className="space-y-2 sm:space-y-3 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-muted rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 sm:h-3 bg-muted rounded-full w-3/4" />
              <div className="h-2 sm:h-2.5 bg-muted rounded-full w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2 sm:mb-3">
          <span className="text-xl sm:text-2xl">🎉</span>
        </div>
        <p className="text-sm font-medium text-foreground">{ui.noAlerts}</p>
        <p className="text-xs text-muted-foreground mt-1">{ui.everyonePresent}</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {alerts.map((a) => {
        const isAbsent = a.status === 'absent'
        return (
          <div key={a.id}
            className="flex items-start gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl hover:bg-muted/50 transition">

            {/* Icon */}
            <div className={`mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0
              ${isAbsent ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
              {isAbsent
                ? <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                : <Clock         className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{a.studentName}</p>
                {/* Badge uses inline style for theme safety */}
                <span
                  className="shrink-0 text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isAbsent ? 'rgba(239,68,68,0.12)'  : 'rgba(245,158,11,0.12)',
                    color:           isAbsent ? '#ef4444'                : '#f59e0b',
                  }}
                >
                  {isAbsent ? ui.absent : ui.late}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                {a.groupName} · {a.courseName}
              </p>
            </div>

            {/* Date */}
            <p className="text-[10px] sm:text-xs text-muted-foreground shrink-0 mt-0.5">
              {a.date ? new Date(a.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }) : ''}
            </p>
          </div>
        )
      })}
    </div>
  )
}
