'use client'
// components/analytics/stat-card.tsx

import type { LucideIcon } from 'lucide-react'

interface Props {
  label:       string
  value:       string
  icon:        LucideIcon
  trend?:      string
  trendUp?:    boolean
  colorClass?: string
  bgClass?:    string
}

export function StatCard({
  label, value, icon: Icon, trend, trendUp,
  colorClass = 'from-blue-500 to-blue-600',
  bgClass    = 'bg-blue-500/10',
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 md:p-6 shadow-sm flex flex-col gap-2 sm:gap-3 md:gap-4">

      {/* Gradient blob */}
      <div className={`absolute -top-6 -right-6 w-20 sm:w-24 h-20 sm:h-24 rounded-full
        bg-gradient-to-br ${colorClass} opacity-10 blur-2xl pointer-events-none`} />

      {/* Label + icon */}
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight pr-2">{label}</p>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/70" />
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">{value}</p>

      {/* Trend badge */}
      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: trendUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color:           trendUp ? '#22c55e'               : '#ef4444',
            }}
          >
            {trendUp ? '▲' : '▼'} {trend}
          </span>
        </div>
      )}
    </div>
  )
}