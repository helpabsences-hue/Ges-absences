'use client'
// components/payments/PaymentModal.tsx — record / view / delete payments + receipts for one student

import { useMemo, useState } from 'react'
import { localDate } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  type Lang, type Payment, type PaymentMethod, type PaymentType, type PayStudent,
  SCHOOL_MONTHS, MONTH_NAMES, PAYMENT_COLUMNS, T,
  dateLocale, fmtMAD, groupIntoReceipts, isMonthDue, lastAmount, paymentLabel, printReceipt,
} from '@/lib/payments'

interface Props {
  lang: Lang
  schoolId: string
  schoolName: string
  schoolYear: string
  profileId: string
  student: PayStudent
  groupName: string
  payments: Payment[]
  onClose: () => void
  onChanged: () => void
}

export default function PaymentModal({
  lang, schoolId, schoolName, schoolYear, profileId, student, groupName, payments, onClose, onChanged,
}: Props) {
  const t = T[lang]
  const isRtl = lang === 'ar'

  const hasAnnual      = payments.some(p => p.type === 'annual')
  const hasInscription = payments.some(p => p.type === 'inscription')
  const paidMonths     = new Set(payments.filter(p => p.type === 'monthly').map(p => p.month))

  const defaultType: PaymentType = !hasInscription ? 'inscription' : 'monthly'
  const prefill = (tp: PaymentType) => { const a = lastAmount(payments, tp); return a !== null ? String(a) : '' }

  const [type, setType]     = useState<PaymentType>(defaultType)
  const [months, setMonths] = useState<number[]>(() => {
    const firstDue = SCHOOL_MONTHS.find(m => !paidMonths.has(m) && isMonthDue(m, schoolYear))
    return firstDue ? [firstDue] : []
  })
  const [amount, setAmount] = useState(() => prefill(defaultType))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [date, setDate]     = useState(localDate())
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  const changeType = (tp: PaymentType) => { setType(tp); setAmount(prefill(tp)) }
  const toggleMonth = (m: number) =>
    setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const total    = type === 'monthly' ? (Number(amount) || 0) * months.length : Number(amount) || 0
  const receipts = useMemo(() => groupIntoReceipts(payments), [payments])

  const receipt = (ps: Payment[]) => printReceipt({
    lang, schoolName, studentName: student.name, massarCode: student.massar_code, groupName, payments: ps,
  })

  // ── Save payment ──
  const submit = async () => {
    if (type === 'monthly' && months.length === 0) { toast.error(t.selectMonths); return }
    if (!(Number(amount) > 0)) { toast.error(t.enterAmount); return }
    setSaving(true)
    const base = {
      school_id: schoolId, student_id: student.id, school_year: schoolYear,
      method, paid_at: date, note: note.trim() || null, recorded_by: profileId,
    }
    const rows = type === 'monthly'
      ? [...months].sort((a, b) => SCHOOL_MONTHS.indexOf(a) - SCHOOL_MONTHS.indexOf(b))
          .map(m => ({ ...base, type: 'monthly', month: m, amount: Number(amount) }))
      : [{ ...base, type, month: null, amount: Number(amount) }]

    const { data, error } = await createClient().from('payments').insert(rows).select(PAYMENT_COLUMNS)
    setSaving(false)
    if (error) {
      toast.error(error.code === '23505' ? t.alreadyPaid : `${t.error}: ${error.message}`)
      return
    }
    const saved = ((data ?? []) as any[]).map(x => ({ ...x, amount: Number(x.amount) })) as Payment[]
    toast.success(t.saved, { action: { label: t.receipt, onClick: () => receipt(saved) }, duration: 8000 })
    onChanged()
    onClose()
  }

  // ── Delete a receipt (all payments saved together) ──
  const remove = async (ps: Payment[]) => {
    if (!confirm(t.confirmDelete)) return
    const { error } = await createClient().from('payments').delete().in('id', ps.map(p => p.id))
    if (error) { toast.error(`${t.error}: ${error.message}`); return }
    toast.success(t.saved)
    onChanged()
  }

  const input = `w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white
    focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRtl ? 'text-right' : ''}`
  const lbl = 'block text-xs font-medium text-slate-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">{student.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{groupName} · {student.massar_code}</p>
          </div>
          <button onClick={onClose} aria-label={t.close} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Record payment */}
          {!hasAnnual && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-white">{t.recordPayment}</h4>

              <div className="flex gap-1.5 flex-wrap">
                {(['inscription', 'monthly', 'annual'] as PaymentType[]).map(tp => {
                  const disabled = (tp === 'inscription' && hasInscription) || (tp === 'annual' && paidMonths.size > 0)
                  return (
                    <button key={tp} disabled={disabled} onClick={() => changeType(tp)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed
                        ${type === tp ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                      {t[tp]}
                    </button>
                  )
                })}
              </div>

              {type === 'monthly' && (
                <div>
                  <span className={lbl}>{t.months}</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SCHOOL_MONTHS.map(m => {
                      const paid = paidMonths.has(m)
                      const on   = months.includes(m)
                      return (
                        <button key={m} disabled={paid} onClick={() => toggleMonth(m)}
                          className={`text-xs py-1.5 rounded-lg border transition
                            ${paid ? 'bg-green-500/10 border-green-500/30 text-green-400 cursor-not-allowed'
                              : on ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                          {paid ? '✓ ' : ''}{MONTH_NAMES[lang][m]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{type === 'monthly' ? t.amountPerMonth : t.amount}</label>
                  <input type="number" inputMode="numeric" min="0" value={amount} placeholder="MAD"
                    onChange={e => setAmount(e.target.value)} className={input} />
                </div>
                <div>
                  <label className={lbl}>{t.method}</label>
                  <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className={input}>
                    <option value="cash">{t.cash}</option>
                    <option value="virement">{t.virement}</option>
                    <option value="cheque">{t.cheque}</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>{t.date}</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
                </div>
                <div>
                  <label className={lbl}>{t.note}</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)} className={input} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-sm text-slate-400">{t.total}: <b className="text-white">{fmtMAD(total)}</b></span>
                <button onClick={submit} disabled={saving}
                  className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition">
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </section>
          )}

          {/* History — one line per receipt */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-white">{t.history}</h4>
            {receipts.length === 0 ? (
              <p className="text-xs text-slate-500">{t.noPayments}</p>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl">
                {receipts.map(ps => (
                  <div key={ps[0].id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{ps.map(p => paymentLabel(p, lang)).join(', ')}</p>
                      <p className="text-xs text-slate-500">
                        {fmtMAD(ps.reduce((a, p) => a + p.amount, 0))} · {t[ps[0].method]} · {new Date(ps[0].paid_at + 'T00:00:00').toLocaleDateString(dateLocale(lang))}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => receipt(ps)}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-500/10">
                        {t.receipt}
                      </button>
                      <button onClick={() => remove(ps)}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10">
                        {t.deletePayment}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}