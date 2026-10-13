'use client'
// components/payments/ParentPayments.tsx — payment status + receipts for one child (parent portal)

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type Lang, type Payment,
  SCHOOL_MONTHS, MONTH_NAMES, PAYMENT_COLUMNS, T,
  currentSchoolYear, dateLocale, fmtMAD, groupIntoReceipts, monthStatus, paymentLabel, printReceipt,
} from '@/lib/payments'

interface Props {
  studentId: string
  studentName: string
  massarCode?: string
  groupName?: string
  schoolName: string
  lang?: Lang
}

export default function ParentPayments({ studentId, studentName, massarCode, groupName, schoolName, lang = 'fr' }: Props) {
  const t = T[lang]
  const schoolYear = currentSchoolYear()
  const [loading, setLoading]   = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const { data } = await createClient().from('payments').select(PAYMENT_COLUMNS)
        .eq('student_id', studentId).eq('school_year', schoolYear)
      if (cancelled) return
      setPayments(((data ?? []) as any[]).map(x => ({ ...x, amount: Number(x.amount) })))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [studentId, schoolYear])

  const receipts = useMemo(() => groupIntoReceipts(payments), [payments])

  // School doesn't use payments for this child yet → hide the section
  if (!loading && payments.length === 0) return null

  const hasInscription = payments.some(p => p.type === 'inscription')
  const paidDate = (m: number) =>
    (payments.find(x => x.type === 'annual') ?? payments.find(x => x.type === 'monthly' && x.month === m))?.paid_at

  const badge = (status: 'paid' | 'unpaid' | 'upcoming') =>
    status === 'paid'     ? <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400">{t.paid}</span>
    : status === 'unpaid' ? <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400">{t.unpaid}</span>
    : <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-500">{t.upcoming}</span>

  const receipt = (ps: Payment[]) => printReceipt({ lang, schoolName, studentName, massarCode, groupName, payments: ps })

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="px-5 py-4 border-b border-slate-800">
        <h3 className="font-semibold text-white text-sm">{t.yourPayments}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{t.schoolYear} {schoolYear}</p>
      </div>

      {loading ? (
        <div className="p-5"><div className="animate-pulse bg-slate-800 rounded-xl h-32" /></div>
      ) : (
        <>
          <div className="divide-y divide-slate-800">
            {hasInscription && (
              <div className="px-5 py-3 flex items-center justify-between">
                <p className="text-sm text-white">{t.inscription}</p>
                {badge('paid')}
              </div>
            )}
            {SCHOOL_MONTHS.map(m => {
              const status = monthStatus(m, payments, schoolYear)
              const d = paidDate(m)
              return (
                <div key={m} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{MONTH_NAMES[lang][m]}</p>
                    {status === 'paid' && d && (
                      <p className="text-xs text-slate-500">{t.paidOn} {new Date(d + 'T00:00:00').toLocaleDateString(dateLocale(lang))}</p>
                    )}
                  </div>
                  {badge(status)}
                </div>
              )
            })}
          </div>

          {/* Receipts */}
          <div className="border-t border-slate-800 px-5 py-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.receipt}</p>
            {receipts.map(ps => (
              <div key={ps[0].id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{ps.map(p => paymentLabel(p, lang)).join(', ')}</p>
                  <p className="text-xs text-slate-500">
                    {fmtMAD(ps.reduce((a, p) => a + p.amount, 0))} · {new Date(ps[0].paid_at + 'T00:00:00').toLocaleDateString(dateLocale(lang))}
                  </p>
                </div>
                <button onClick={() => receipt(ps)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 shrink-0">
                  {t.receipt}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}