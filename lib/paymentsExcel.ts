// lib/paymentsExcel.ts — Excel export of payments (3 sheets: payments, grid, unpaid)

import * as XLSX from 'xlsx'
import {
  type Lang, type Payment, type PayStudent,
  SCHOOL_MONTHS, MONTH_NAMES, T,
  groupIntoReceipts, inscriptionPaid, monthStatus, receiptNumber, unpaidMonths,
} from '@/lib/payments'

const H: Record<Lang, Record<string, string>> = {
  fr: {
    sheetPayments: 'Paiements', sheetGrid: 'Grille', sheetUnpaid: 'Impayés',
    date: 'Date', receipt: 'Reçu N°', student: 'Élève', massar: 'Code Massar', group: 'Groupe',
    type: 'Type', month: 'Mois', amount: 'Montant (MAD)', method: 'Mode', note: 'Note',
    parent: 'Parent', phone: 'Téléphone', count: 'Nb mois impayés', months: 'Mois impayés', total: 'TOTAL',
  },
  en: {
    sheetPayments: 'Payments', sheetGrid: 'Grid', sheetUnpaid: 'Unpaid',
    date: 'Date', receipt: 'Receipt No.', student: 'Student', massar: 'Massar code', group: 'Group',
    type: 'Type', month: 'Month', amount: 'Amount (MAD)', method: 'Method', note: 'Note',
    parent: 'Parent', phone: 'Phone', count: 'Unpaid months (count)', months: 'Unpaid months', total: 'TOTAL',
  },
  ar: {
    sheetPayments: 'الأداءات', sheetGrid: 'الجدول', sheetUnpaid: 'غير المؤدى',
    date: 'التاريخ', receipt: 'رقم الوصل', student: 'التلميذ', massar: 'رمز مسار', group: 'الفصل',
    type: 'النوع', month: 'الشهر', amount: 'المبلغ (درهم)', method: 'طريقة الأداء', note: 'ملاحظة',
    parent: 'ولي الأمر', phone: 'الهاتف', count: 'عدد الأشهر غير المؤداة', months: 'الأشهر غير المؤداة', total: 'المجموع',
  },
}

// 'YYYY-MM-DD' → Excel date number (no timezone shift)
function excelDate(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000
}

export function exportPaymentsExcel(opts: {
  lang: Lang
  schoolName: string
  schoolYear: string
  students: PayStudent[]
  payments: Payment[]
  groupName: Record<string, string>
}) {
  const { lang, schoolName, schoolYear, students, payments, groupName } = opts
  const t = T[lang]
  const h = H[lang]
  const M = MONTH_NAMES[lang]
  const byId = Object.fromEntries(students.map(s => [s.id, s]))
  const studentIds = new Set(students.map(s => s.id))
  const ps = payments.filter(p => studentIds.has(p.student_id))

  // Receipt number of each payment (payments saved together share one)
  const receiptOf: Record<string, string> = {}
  groupIntoReceipts(ps).forEach(batch => {
    const n = receiptNumber(batch[0].id)
    batch.forEach(p => { receiptOf[p.id] = n })
  })

  const wb = XLSX.utils.book_new()
  if (lang === 'ar') wb.Workbook = { Views: [{ RTL: true }] }

  // ── Sheet 1: every payment, oldest first, with total ──
  const rows = [...ps]
    .sort((a, b) => a.paid_at.localeCompare(b.paid_at) || a.created_at.localeCompare(b.created_at))
    .map(p => {
      const s = byId[p.student_id]
      return [
        excelDate(p.paid_at),
        receiptOf[p.id],
        s?.name ?? '',
        s?.massar_code ?? '',
        groupName[s?.group_id ?? ''] ?? '',
        t[p.type],
        p.type === 'monthly' ? M[p.month ?? 0] : '',
        p.amount,
        t[p.method],
        p.note ?? '',
      ]
    })
  const total = ps.reduce((a, p) => a + p.amount, 0)
  const sheet1 = XLSX.utils.aoa_to_sheet([
    [`${schoolName} — ${t.schoolYear} ${schoolYear}`],
    [],
    [h.date, h.receipt, h.student, h.massar, h.group, h.type, h.month, h.amount, h.method, h.note],
    ...rows,
    [],
    [h.total, '', '', '', '', '', '', total],
  ])
  // Format column A (dates) of the payment rows
  rows.forEach((_, i) => {
    const cell = sheet1[XLSX.utils.encode_cell({ r: i + 3, c: 0 })]
    if (cell) cell.z = 'dd/mm/yyyy'
  })
  sheet1['!cols'] = [12, 12, 26, 14, 12, 14, 10, 14, 14, 24].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(wb, sheet1, h.sheetPayments)

  // ── Sheet 2: grid students × months ──
  const status = (st: 'paid' | 'unpaid' | 'upcoming') => st === 'paid' ? t.paid : st === 'unpaid' ? t.unpaid : ''
  const gridRows = students.map(s => {
    const sp = ps.filter(p => p.student_id === s.id)
    return [
      s.name,
      groupName[s.group_id ?? ''] ?? '',
      inscriptionPaid(sp) ? t.paid : '',
      ...SCHOOL_MONTHS.map(m => status(monthStatus(m, sp, schoolYear))),
      sp.reduce((a, p) => a + p.amount, 0),
    ]
  })
  const sheet2 = XLSX.utils.aoa_to_sheet([
    [h.student, h.group, t.inscription, ...SCHOOL_MONTHS.map(m => M[m]), h.amount],
    ...gridRows,
  ])
  sheet2['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 12 }, ...SCHOOL_MONTHS.map(() => ({ wch: 10 })), { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, sheet2, h.sheetGrid)

  // ── Sheet 3: unpaid ──
  const unpaidRows = students
    .map(s => ({ s, months: unpaidMonths(ps.filter(p => p.student_id === s.id), schoolYear) }))
    .filter(r => r.months.length > 0)
    .sort((a, b) => b.months.length - a.months.length)
    .map(({ s, months }) => [
      s.name, groupName[s.group_id ?? ''] ?? '', s.parent_name ?? '', s.parent_phone ?? '',
      months.length, months.map(m => M[m]).join(', '),
    ])
  const sheet3 = XLSX.utils.aoa_to_sheet([
    [h.student, h.group, h.parent, h.phone, h.count, h.months],
    ...unpaidRows,
  ])
  sheet3['!cols'] = [26, 12, 22, 16, 12, 40].map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(wb, sheet3, h.sheetUnpaid)

  const safe = schoolName.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'ecole'
  XLSX.writeFile(wb, `Paiements_${safe}_${schoolYear}.xlsx`)
}