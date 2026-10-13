'use client'
export const dynamic = 'force-dynamic'
// app/dashboard/payments/page.tsx — school fees: payment grid + unpaid list

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import PaymentModal from '@/components/payments/PaymentModal'
import UnpaidTab, { type UnpaidRow } from '@/components/payments/UnpaidTab'
import { exportPaymentsExcel } from '@/lib/paymentsExcel'
import {
  type Lang, type Payment, type PayStudent,
  SCHOOL_MONTHS, MONTH_NAMES, PAYMENT_COLUMNS, T,
  currentSchoolYear, previousSchoolYear, fmtMAD, inscriptionPaid, monthStatus, unpaidMonths,
} from '@/lib/payments'

type Tab = 'grid' | 'unpaid'

export default function PaymentsPage() {
  const { profile }  = useAuthStore()
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const t     = T[lang]
  const isRtl = lang === 'ar'

  const thisYear = currentSchoolYear()
  const [schoolYear, setSchoolYear] = useState(thisYear)
  const [tab, setTab]               = useState<Tab>('grid')
  const [loading, setLoading]       = useState(true)
  const [groupFilter, setGroup]     = useState('')
  const [search, setSearch]         = useState('')

  const [groups, setGroups]     = useState<{ id: string; name: string }[]>([])
  const [students, setStudents] = useState<PayStudent[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [openStudent, setOpen]  = useState<PayStudent | null>(null)

  const schoolId   = profile?.school_id
  const schoolName = profile?.schools?.name ?? ''

  const load = useCallback(async () => {
    if (!schoolId) return
    setLoading(true)
    const supabase = createClient()
    const [g, s, p] = await Promise.all([
      supabase.from('groups').select('id, name').eq('school_id', schoolId).order('name'),
      supabase.from('students').select('id, name, massar_code, group_id, parent_name, parent_phone')
        .eq('school_id', schoolId).order('name'),
      supabase.from('payments').select(PAYMENT_COLUMNS)
        .eq('school_id', schoolId).eq('school_year', schoolYear),
    ])
    setGroups(g.data ?? [])
    setStudents((s.data ?? []) as PayStudent[])
    setPayments(((p.data ?? []) as any[]).map(x => ({ ...x, amount: Number(x.amount) })) as Payment[])
    setLoading(false)
  }, [schoolId, schoolYear])

  useEffect(() => { load() }, [load])

  const groupName = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups])

  const paymentsByStudent = useMemo(() => {
    const m: Record<string, Payment[]> = {}
    payments.forEach(p => { (m[p.student_id] ??= []).push(p) })
    return m
  }, [payments])

  const unpaidRows: UnpaidRow[] = useMemo(() => students
    .map(st => ({
      student: st,
      groupName: groupName[st.group_id ?? ''] ?? '—',
      unpaidMonths: unpaidMonths(paymentsByStudent[st.id] ?? [], schoolYear),
    }))
    .filter(r => r.unpaidMonths.length > 0)
    .sort((a, b) => b.unpaidMonths.length - a.unpaidMonths.length),
  [students, paymentsByStudent, schoolYear, groupName])

  // Summary cards
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const collectedYear  = payments.reduce((a, p) => a + p.amount, 0)
  const collectedMonth = payments.filter(p => p.paid_at.startsWith(monthKey)).reduce((a, p) => a + p.amount, 0)

  const filtered = students.filter(s =>
    (!groupFilter || s.group_id === groupFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.massar_code.toLowerCase().includes(search.toLowerCase())))

  const stickySide = isRtl ? 'right-0' : 'left-0'

  const cell = (status: 'paid' | 'unpaid' | 'upcoming') =>
    status === 'paid'     ? <span className="inline-block w-6 h-6 leading-6 rounded-md bg-green-500/15 text-green-400 text-xs font-bold">✓</span>
    : status === 'unpaid' ? <span className="inline-block w-6 h-6 leading-6 rounded-md bg-red-500/15 text-red-400 text-xs font-bold">✗</span>
    : <span className="text-slate-700 text-xs">—</span>

  if (!profile) return null

  return (
    <div className="max-w-7xl mx-auto space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{t.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportPaymentsExcel({
              lang, schoolName, schoolYear, payments, groupName,
              students: students.filter(s => !groupFilter || s.group_id === groupFilter),
            })}
            disabled={loading}
            className="flex items-center gap-2 bg-green-700/20 hover:bg-green-700/30 border border-green-600/30 text-green-400 text-sm font-medium px-3 py-2 rounded-xl transition disabled:opacity-50">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t.exportExcel}
          </button>
          <span className="text-xs text-slate-500">{t.schoolYear}</span>
          <select value={schoolYear} onChange={e => setSchoolYear(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value={thisYear}>{thisYear}</option>
            <option value={previousSchoolYear(thisYear)}>{previousSchoolYear(thisYear)}</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: t.collectedYear,  value: fmtMAD(collectedYear),     color: 'text-white' },
          { label: t.collectedMonth, value: fmtMAD(collectedMonth),    color: 'text-green-400' },
          { label: t.unpaidStudents, value: String(unpaidRows.length), color: 'text-amber-400' },
        ].map((c, i) => (
          <div key={c.label} className={`bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 min-w-0 ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className={`text-base sm:text-xl font-bold truncate ${c.color}`}>{loading ? '…' : c.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {([['grid', t.tabGrid], ['unpaid', `${t.tabUnpaid} (${unpaidRows.length})`]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap
              ${tab === k ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading && students.length === 0 ? (
        <div className="animate-pulse bg-slate-900 border border-slate-800 rounded-2xl h-64" />
      ) : tab === 'unpaid' ? (
        <UnpaidTab lang={lang} rows={unpaidRows} schoolName={schoolName} onOpen={setOpen} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56" />
            <select value={groupFilter} onChange={e => setGroup(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto">
              <option value="">{t.allGroups}</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {/* Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-500 py-12 text-sm">{t.noStudents}</p>
            ) : (
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                    <th className={`px-3 sm:px-4 py-3 sticky ${stickySide} z-10 bg-slate-900 ${isRtl ? 'text-right' : 'text-left'}`}>{t.student}</th>
                    <th className="px-2 py-3">{t.inscription}</th>
                    {SCHOOL_MONTHS.map(m => <th key={m} className="px-2 py-3">{MONTH_NAMES[lang][m]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(st => {
                    const ps = paymentsByStudent[st.id] ?? []
                    const hasAnnual = ps.some(p => p.type === 'annual')
                    return (
                      <tr key={st.id} onClick={() => setOpen(st)} className="group hover:bg-slate-800/40 cursor-pointer">
                        <td className={`px-3 sm:px-4 py-2.5 sticky ${stickySide} z-10 bg-slate-900 group-hover:bg-slate-800 max-w-[150px] sm:max-w-none`}>
                          <p className="text-sm font-medium text-white truncate">{st.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {groupName[st.group_id ?? ''] ?? '—'}
                            {hasAnnual && <span className="text-blue-400"> · {t.annual}</span>}
                          </p>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {cell(inscriptionPaid(ps) ? 'paid' : 'upcoming')}
                        </td>
                        {SCHOOL_MONTHS.map(m => (
                          <td key={m} className="px-2 py-2.5 text-center">{cell(monthStatus(m, ps, schoolYear))}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {openStudent && (
        <PaymentModal
          lang={lang}
          schoolId={schoolId!}
          schoolName={schoolName}
          schoolYear={schoolYear}
          profileId={profile.id}
          student={openStudent}
          groupName={groupName[openStudent.group_id ?? ''] ?? '—'}
          payments={paymentsByStudent[openStudent.id] ?? []}
          onClose={() => setOpen(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}