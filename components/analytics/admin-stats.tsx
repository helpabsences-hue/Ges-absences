'use client'
// components/analytics/admin-stats.tsx

import { useState, useEffect } from 'react'
import { StatCard } from '@/components/analytics/stat-card'
import { Users, GraduationCap, AlertCircle, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Lang = 'fr' | 'en' | 'ar'

const LABELS: Record<string, Record<Lang, string>> = {
  totalTeachers:  { fr: 'Total Enseignants',     en: 'Total Teachers',   ar: 'إجمالي الأساتذة'   },
  totalStudents:  { fr: 'Total Étudiants',        en: 'Total Students',   ar: 'إجمالي الطلاب'     },
  absencesToday:  { fr: "Absences Aujourd'hui",   en: 'Absences Today',   ar: 'الغيابات اليوم'    },
  attendanceRate: { fr: "Taux d'Assiduité",       en: 'Attendance Rate',  ar: 'نسبة الحضور'       },
  updated:        { fr: 'Mis à jour',             en: 'Updated',          ar: 'محدّث'             },
  today:          { fr: "Aujourd'hui",            en: 'Today',            ar: 'اليوم'             },
}

interface Stats {
  totalTeachers:  number
  totalStudents:  number
  absencesToday:  number
  attendanceRate: number
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm animate-pulse space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-3 sm:h-3.5 w-24 sm:w-28 bg-muted rounded-full" />
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-xl" />
      </div>
      <div className="h-7 sm:h-9 w-20 sm:w-24 bg-muted rounded-lg" />
      <div className="h-4 sm:h-5 w-16 sm:w-20 bg-muted rounded-full" />
    </div>
  )
}

export function AdminStats({ lang = 'fr' }: { lang?: Lang }) {
  const [stats,   setStats]   = useState<Stats>({ totalTeachers: 0, totalStudents: 0, absencesToday: 0, attendanceRate: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      const today    = new Date().toISOString().split('T')[0]

      const [
        { count: teachers },
        { count: students },
        { count: absences },
        { data: todayRecords },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('attendance')
          .select('*, class_sessions!inner(session_date)', { count: 'exact', head: true })
          .eq('status', 'absent')
          .eq('class_sessions.session_date', today),
        supabase.from('attendance')
          .select('status, class_sessions!inner(session_date)')
          .eq('class_sessions.session_date', today),
      ])

      let present = 0, late = 0, total = 0
      todayRecords?.forEach((r: any) => {
        total++
        if (r.status === 'present') present++
        if (r.status === 'late')    late++
      })
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

      setStats({ totalTeachers: teachers ?? 0, totalStudents: students ?? 0, absencesToday: absences ?? 0, attendanceRate: rate })
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
      <StatCard
        label={LABELS.totalTeachers[lang]}
        value={stats.totalTeachers.toString()}
        icon={Users}
        trend={LABELS.updated[lang]}
        trendUp
        colorClass="from-blue-500 to-blue-600"
        bgClass="bg-blue-500/10"
      />
      <StatCard
        label={LABELS.totalStudents[lang]}
        value={stats.totalStudents.toString()}
        icon={GraduationCap}
        trend={LABELS.updated[lang]}
        trendUp
        colorClass="from-violet-500 to-violet-600"
        bgClass="bg-violet-500/10"
      />
      <StatCard
        label={LABELS.absencesToday[lang]}
        value={stats.absencesToday.toString()}
        icon={AlertCircle}
        trend={LABELS.today[lang]}
        trendUp={false}
        colorClass="from-red-500 to-rose-600"
        bgClass="bg-red-500/10"
      />
      <StatCard
        label={LABELS.attendanceRate[lang]}
        value={`${stats.attendanceRate}%`}
        icon={BarChart3}
        trend={LABELS.today[lang]}
        trendUp={stats.attendanceRate >= 70}
        colorClass="from-emerald-500 to-green-600"
        bgClass="bg-emerald-500/10"
      />
    </div>
  )
}
