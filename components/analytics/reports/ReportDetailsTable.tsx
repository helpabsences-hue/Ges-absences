'use client'
// components/analytics/reports/ReportDetailsTable.tsx
// Absence details tab with filter + CSV export

import { Download } from 'lucide-react'
import { type AbsenceRow, type FilterType, type Lang, fmtHours } from './types'
import { SkeletonBlock } from './ReportUI'

interface Labels {
  allFilter: string; absentsFilter: string; latesFilter: string
  exportCsv: string; noRecords: string; adjustFilters: string
  colStudent: string; colClass: string; colCourse: string; colDate: string
  colType: string; colHours: string; colReason: string; colState: string
  absentBadge: string; lateBadge: string
  justified: string; notJustified: string
  hours: string
}

interface Props {
  loading:          boolean
  absenceRows:      AbsenceRow[]
  filteredAbsences: AbsenceRow[]
  filterType:       FilterType
  setFilterType:    (f: FilterType) => void
  onExport:         () => void
  isRtl:            boolean
  dateLocale:       string
  labels:           Labels
}

export function ReportDetailsTable({
  loading, absenceRows, filteredAbsences, filterType, setFilterType,
  onExport, isRtl, dateLocale, labels,
}: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

      {/* Toolbar */}
      <div className={`px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap
        ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
          {([
            { key: 'all'    as FilterType, label: `${labels.allFilter} (${absenceRows.length})`                                       },
            { key: 'absent' as FilterType, label: `${labels.absentsFilter} (${absenceRows.filter(r => r.status==='absent').length})`  },
            { key: 'late'   as FilterType, label: `${labels.latesFilter} (${absenceRows.filter(r => r.status==='late').length})`      },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilterType(key)}
              className={`text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition
                ${filterType === key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={onExport}
          className={`flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700
            text-slate-300 hover:text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition shrink-0
            ${isRtl ? 'flex-row-reverse' : ''}`}>
          <Download className="w-4 h-4 shrink-0" />
          {labels.exportCsv}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-6"><SkeletonBlock /></div>
      ) : filteredAbsences.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-400 font-medium">{labels.noRecords}</p>
          <p className="text-slate-600 text-sm mt-1">{labels.adjustFilters}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {[labels.colStudent, labels.colClass, labels.colCourse, labels.colDate,
                  labels.colType, labels.colHours, labels.colReason, labels.colState].map(h => (
                  <th key={h} className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap
                    ${isRtl ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAbsences.map(r => (
                <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                  <td className="px-4 sm:px-5 py-3">
                    <p className="font-medium text-white">{r.studentName}</p>
                    <p className="text-xs text-slate-500 font-mono">{r.massarCode}</p>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-slate-400 whitespace-nowrap">{r.groupName}</td>
                  <td className="px-4 sm:px-5 py-3 text-slate-400 whitespace-nowrap">{r.courseName}</td>
                  <td className="px-4 sm:px-5 py-3 text-slate-400 whitespace-nowrap">
                    <p>{new Date(r.date).toLocaleDateString(dateLocale, { day:'numeric', month:'short', year:'numeric' })}</p>
                    <p className="text-xs">{r.timeSlot}</p>
                  </td>
                  <td className="px-4 sm:px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                      ${r.status === 'absent' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {r.status === 'absent' ? labels.absentBadge : labels.lateBadge}
                    </span>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right whitespace-nowrap">
                    <span className="text-xs font-semibold text-red-300">{fmtHours(r.durationMinutes, labels.hours)}</span>
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-slate-500 text-xs max-w-[120px] truncate italic">{r.reason || '—'}</td>
                  <td className="px-4 sm:px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                      ${r.justified ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                      {r.justified ? labels.justified : labels.notJustified}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {filteredAbsences.length > 0 && (
        <div className="grid grid-cols-3 gap-4 px-5 sm:px-6 py-4 border-t border-slate-800 text-center">
          {[
            { label: labels.justified,    value: filteredAbsences.filter(r => r.justified).length  },
            { label: labels.notJustified, value: filteredAbsences.filter(r => !r.justified).length },
            { label: 'Total',             value: filteredAbsences.length                           },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
