'use client'
// components/analytics/reports/ReportUI.tsx
// Shared small UI components: RateBar, CustomTooltip, SkeletonBlock

import { rateColor, rateBg } from './types'

export function RateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${rateBg(rate)}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${rateColor(rate)}`}>{rate}%</span>
    </div>
  )
}

export function CustomTooltip({ active, payload, label, rateLabel }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-semibold text-white mb-1">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold text-white">{p.value}{p.name === rateLabel ? '%' : ''}</span>
        </div>
      ))}
    </div>
  )
}

export function SkeletonBlock({ height = 260 }: { height?: number }) {
  return <div className="animate-pulse bg-slate-800 rounded-xl" style={{ height }} />
}
