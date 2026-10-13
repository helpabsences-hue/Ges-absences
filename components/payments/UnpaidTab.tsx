'use client'
// components/payments/UnpaidTab.tsx — students with unpaid months + WhatsApp reminder

import { type Lang, type PayStudent, MONTH_NAMES, T, whatsappLink } from '@/lib/payments'

export interface UnpaidRow {
  student: PayStudent
  groupName: string
  unpaidMonths: number[]
}

interface Props {
  lang: Lang
  rows: UnpaidRow[]
  schoolName: string
  onOpen: (s: PayStudent) => void
}

export default function UnpaidTab({ lang, rows, schoolName, onOpen }: Props) {
  const t = T[lang]
  const isRtl = lang === 'ar'

  if (rows.length === 0) {
    return <p className="text-center text-slate-400 py-12 text-sm">{t.allPaid}</p>
  }

  const monthsText = (r: UnpaidRow) => r.unpaidMonths.map(m => MONTH_NAMES[lang][m]).join(', ')

  const message = (r: UnpaidRow) =>
    t.waMessage
      .replace('{parent}', r.student.parent_name || '')
      .replace('{student}', r.student.name)
      .replace('{months}', monthsText(r))
      .replace('{school}', schoolName)

  const waButton = (r: UnpaidRow, full = false) => {
    const link = r.student.parent_phone ? whatsappLink(r.student.parent_phone, message(r)) : null
    return link ? (
      <a href={link} target="_blank" rel="noopener noreferrer"
        className={`inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white whitespace-nowrap ${full ? 'w-full py-2.5 text-sm' : ''}`}>
        {t.remind}
      </a>
    ) : (
      <span className="text-xs text-slate-600">{t.noPhone}</span>
    )
  }

  const countBadge = (r: UnpaidRow) => (
    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md bg-red-500/15 text-red-400 text-xs font-bold">
      {r.unpaidMonths.length}
    </span>
  )

  return (
    <>
      {/* Phone: cards */}
      <div className="sm:hidden space-y-3">
        {rows.map(r => (
          <div key={r.student.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => onOpen(r.student)} className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-semibold text-white truncate">{r.student.name}</p>
                <p className="text-xs text-slate-500">{r.groupName} · {r.student.parent_phone || '—'}</p>
              </button>
              {countBadge(r)}
            </div>
            <p className="text-xs text-slate-400">{t.unpaidMonths}: {monthsText(r)}</p>
            {waButton(r, true)}
          </div>
        ))}
      </div>

      {/* Tablet & desktop: table */}
      <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
              <th className={`px-4 py-3 ${isRtl ? 'text-right' : 'text-left'}`}>{t.student}</th>
              <th className={`px-4 py-3 ${isRtl ? 'text-right' : 'text-left'}`}>{t.unpaidMonths}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map(r => (
              <tr key={r.student.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <button onClick={() => onOpen(r.student)} className={isRtl ? 'text-right' : 'text-left'}>
                    <p className="text-sm font-medium text-white hover:text-blue-400">{r.student.name}</p>
                    <p className="text-xs text-slate-500">{r.groupName} · {r.student.parent_phone || '—'}</p>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {countBadge(r)}
                    <span className="text-xs text-slate-400">{monthsText(r)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">{waButton(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}