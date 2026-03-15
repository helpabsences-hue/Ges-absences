'use client'
// components/analytics/reports/ReportCharts.tsx
// Bar chart + Pie chart

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { type GroupStat, PIE_COLORS } from './types'
import { SkeletonBlock, CustomTooltip } from './ReportUI'

interface Props {
  loading:     boolean
  groupStats:  GroupStat[]
  reasonData:  { name: string; value: number; fill: string }[]
  barTitle:    string
  pieTitle:    string
  noData:      string
  noAbsence:   string
  rateLabel:   string
}

export function ReportCharts({ loading, groupStats, reasonData, barTitle, pieTitle, noData, noAbsence, rateLabel }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

      {/* Bar chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">{barTitle}</h3>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? <SkeletonBlock /> : groupStats.length === 0 ? (
            <p className="text-center text-slate-500 py-16 text-sm">{noData}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={groupStats.map(g => ({ class: g.group_name, [rateLabel]: g.rate }))}
                margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border,#1e293b)" vertical={false} />
                <XAxis dataKey="class" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground,#94a3b8)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground,#94a3b8)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip rateLabel={rateLabel} />} />
                <Bar dataKey={rateLabel} fill="#3b82f6" radius={[6,6,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white">{pieTitle}</h3>
        </div>
        <div className="p-4 sm:p-6">
          {loading ? <SkeletonBlock /> : reasonData.length === 0 ? (
            <p className="text-center text-slate-500 py-16 text-sm">{noAbsence}</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={reasonData} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                  label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
                  {reasonData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span className="text-xs text-slate-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
