'use client'
// components/analytics/reports/ReportStatsTables.tsx
// Par Groupe + Par Étudiant tabs with hours column

import { type GroupStat, type StudentStat, type StatTab, type Lang, fmtHours, rateColor } from './types'
import { RateBar, SkeletonBlock } from './ReportUI'

interface Labels {
  byGroup: string; byStudent: string
  colGroup: string; colPresent: string; colLate: string; colAbsent: string
  colHours: string; colRate: string
  colStudent: string; colClass: string
  atRisk: string; records: string; hours: string; noData: string
}

interface Props {
  loading:      boolean
  statTab:      StatTab
  setStatTab:   (t: StatTab) => void
  groupStats:   GroupStat[]
  studentStats: StudentStat[]
  isRtl:        boolean
  labels:       Labels
}

export function ReportStatsTables({ loading, statTab, setStatTab, groupStats, studentStats, isRtl, labels }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

      {/* Sub-tabs */}
      <div className={`px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
        {([
          { key: 'group'   as StatTab, label: labels.byGroup   },
          { key: 'student' as StatTab, label: labels.byStudent },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setStatTab(key)}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all
              ${statTab === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-6"><SkeletonBlock /></div>

      ) : statTab === 'group' ? (
        groupStats.length === 0
          ? <p className="text-center text-slate-500 py-12 text-sm">{labels.noData}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {[labels.colGroup, labels.colPresent, labels.colLate, labels.colAbsent, labels.colHours, labels.colRate].map((h, i) => (
                      <th key={h} className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider
                        ${i === 0 || i === 5 ? (isRtl ? 'text-right' : 'text-left') : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {groupStats.map(g => (
                    <tr key={g.group_id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 sm:px-5 py-4">
                        <p className="text-sm font-semibold text-white">{g.group_name}</p>
                        <p className="text-xs text-slate-500">{g.year} · {g.total} {labels.records}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-green-400">{g.present}</span></td>
                      <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-yellow-400">{g.late}</span></td>
                      <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-red-400">{g.absent}</span></td>
                      <td className="px-4 sm:px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-red-300">{fmtHours(g.absenceMinutes, labels.hours)}</span>
                      </td>
                      <td className="px-4 sm:px-5 py-4 w-40"><RateBar rate={g.rate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )

      ) : (
        studentStats.length === 0
          ? <p className="text-center text-slate-500 py-12 text-sm">{labels.noData}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {[labels.colStudent, labels.colClass, labels.colPresent, labels.colLate, labels.colAbsent, labels.colHours, labels.colRate].map((h, i) => (
                      <th key={h} className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider
                        ${i <= 1 || i === 6 ? (isRtl ? 'text-right' : 'text-left') : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {studentStats.map(s => (
                    <tr key={s.student_id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 sm:px-5 py-4">
                        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                            ${s.rate < 70 ? 'bg-red-500/20 border border-red-500/30' : 'bg-slate-800'}`}>
                            <span className={`text-xs font-bold ${s.rate < 70 ? 'text-red-400' : 'text-slate-300'}`}>
                              {s.student_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{s.student_name}</p>
                            <p className="text-xs text-slate-500 font-mono">{s.massar_code}</p>
                          </div>
                          {s.rate < 70 && (
                            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                              {labels.atRisk}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-4 text-sm text-slate-400">{s.group_name}</td>
                      <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-green-400">{s.present}</span></td>
                      <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-yellow-400">{s.late}</span></td>
                      <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-red-400">{s.absent}</span></td>
                      <td className="px-4 sm:px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-red-300">{fmtHours(s.absenceMinutes, labels.hours)}</span>
                      </td>
                      <td className="px-4 sm:px-5 py-4 w-40"><RateBar rate={s.rate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}
    </div>
  )
}
