'use client'
// components/analytics/attendance-chart.tsx

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

type Lang = 'fr' | 'en' | 'ar'
interface ChartData { day: string; present: number; absent: number; late: number }

const DAY_NAMES: Record<Lang, string[]> = {
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ar: ['أح',  'إث',  'ثل',  'أر',  'خم',  'جم',  'سب' ],
}

const LEGEND: Record<Lang, { present: string; absent: string; late: string }> = {
  fr: { present: 'Présent', absent: 'Absent', late: 'Retard'  },
  en: { present: 'Present', absent: 'Absent', late: 'Late'    },
  ar: { present: 'حاضر',   absent: 'غائب',   late: 'متأخر'  },
}

const CHART_LABELS: Record<Lang, { yAxis: string; xAxis: string; title: string; subtitle: string }> = {
  fr: { yAxis: "Nombre d'élèves",    xAxis: 'Jour de la semaine', title: "Tendance d'Assiduité", subtitle: '7 derniers jours' },
  en: { yAxis: 'Number of students', xAxis: 'Day of the week',    title: 'Attendance Trend',     subtitle: 'Last 7 days'      },
  ar: { yAxis: 'عدد الطلاب',         xAxis: 'أيام الأسبوع',      title: 'اتجاه الحضور',          subtitle: 'آخر 7 أيام'      },
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AttendanceChart({ lang = 'fr' }: { lang?: Lang }) {
  const [data,    setData]    = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  const labels = CHART_LABELS[lang]
  const legend = LEGEND[lang]

  useEffect(() => {
    const fetchChartData = async () => {
      const supabase = createClient()
      const dates: string[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        dates.push(d.toISOString().split('T')[0])
      }
      const { data: records } = await supabase
        .from('attendance')
        .select('status, class_sessions!inner(session_date)')
        .gte('class_sessions.session_date', dates[0])
        .lte('class_sessions.session_date', dates[6])

      const byDate: Record<string, ChartData> = {}
      dates.forEach((d) => {
        byDate[d] = { day: DAY_NAMES[lang][new Date(d).getDay()], present: 0, absent: 0, late: 0 }
      })
      records?.forEach((r: any) => {
        const date = r.class_sessions?.session_date
        if (!date || !byDate[date]) return
        if (r.status === 'present') byDate[date].present++
        if (r.status === 'absent')  byDate[date].absent++
        if (r.status === 'late')    byDate[date].late++
      })
      setData(Object.values(byDate))
      setLoading(false)
    }
    fetchChartData()
  }, [lang])

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-full">

      {/* Header */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div>
          <h3 className="font-semibold text-foreground text-sm sm:text-base">{labels.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{labels.subtitle}</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-xs flex-wrap">
          {[
            { label: legend.present, color: '#22c55e' },
            { label: legend.absent,  color: '#ef4444' },
            { label: legend.late,    color: '#f59e0b' },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-3 sm:p-4 md:p-6">
        {loading ? (
          <div className="h-[200px] sm:h-[260px] md:h-[300px] bg-muted animate-pulse rounded-xl" />
        ) : (
          <div className="flex gap-1 sm:gap-2">
            {/* Y-axis label */}
            <div className="hidden sm:flex items-center justify-center"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{labels.yAxis}</span>
            </div>
            <div className="flex-1 min-w-0">
              <ResponsiveContainer width="100%" height={220} {...{ className: 'sm:!h-[260px] md:!h-[300px]' }}>
                <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 20 }}>
                  <defs>
                    {[
                      { id: 'gradPresent', color: '#22c55e' },
                      { id: 'gradAbsent',  color: '#ef4444' },
                      { id: 'gradLate',    color: '#f59e0b' },
                    ].map(({ id, color }) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={color} stopOpacity={0}    />
                      </linearGradient>
                    ))}
                  </defs>

                  {/* Use CSS var for grid lines — works in both themes */}
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" vertical={false} />

                  <XAxis dataKey="day" axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground, #94a3b8)', fontWeight: 500 }}
                    label={{ value: labels.xAxis, position: 'insideBottom', offset: -14,
                      style: { fontSize: 10, fill: 'var(--color-muted-foreground, #94a3b8)' } }}
                  />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false}
                    tick={{ fontSize: 11, fill: 'var(--color-muted-foreground, #94a3b8)' }}
                    width={28}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="present" name={legend.present} stroke="#22c55e" strokeWidth={2} fill="url(#gradPresent)" dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="absent"  name={legend.absent}  stroke="#ef4444" strokeWidth={2} fill="url(#gradAbsent)"  dot={{ fill: '#ef4444', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="late"    name={legend.late}    stroke="#f59e0b" strokeWidth={2} fill="url(#gradLate)"    dot={{ fill: '#f59e0b', r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
