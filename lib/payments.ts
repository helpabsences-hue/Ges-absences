// lib/payments.ts — shared types, translations and helpers for the payments module

export type Lang = 'fr' | 'en' | 'ar'
export type PaymentType = 'inscription' | 'monthly' | 'annual'
export type PaymentMethod = 'cash' | 'virement' | 'cheque'

export interface Payment {
  id: string
  student_id: string
  type: PaymentType
  month: number | null
  amount: number
  method: PaymentMethod
  paid_at: string
  note: string | null
  created_at: string
}

export interface PayStudent {
  id: string
  name: string
  massar_code: string
  group_id: string | null
  parent_name: string | null
  parent_phone: string | null
}

// Kept for older files (tariffs were removed)
export interface GroupFee { id?: string; group_id: string; monthly_amount: number; annual_amount: number; inscription_amount: number }
export interface StudentFee { student_id: string; payment_mode: 'monthly' | 'annual'; discount_amount: number }

export const PAYMENT_COLUMNS = 'id, student_id, type, month, amount, method, paid_at, note, created_at'

// School year months, September → June
export const SCHOOL_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]

export const MONTH_NAMES: Record<Lang, Record<number, string>> = {
  fr: { 1: 'Janv', 2: 'Févr', 3: 'Mars', 4: 'Avr', 5: 'Mai', 6: 'Juin', 9: 'Sept', 10: 'Oct', 11: 'Nov', 12: 'Déc' },
  en: { 1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' },
  ar: { 1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل', 5: 'ماي', 6: 'يونيو', 9: 'شتنبر', 10: 'أكتوبر', 11: 'نونبر', 12: 'دجنبر' },
}

// '2026-2027' — school year starts in September
export function currentSchoolYear(d = new Date()): string {
  const y = d.getFullYear()
  return d.getMonth() + 1 >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export function previousSchoolYear(sy: string): string {
  const start = parseInt(sy.split('-')[0], 10)
  return `${start - 1}-${start}`
}

// Has this month already started in the selected school year?
export function isMonthDue(month: number, schoolYear: string, today = new Date()): boolean {
  const start = parseInt(schoolYear.split('-')[0], 10)
  const year  = month >= 9 ? start : start + 1
  return new Date(year, month - 1, 1) <= today
}

export type MonthStatus = 'paid' | 'unpaid' | 'upcoming'

export function monthStatus(month: number, payments: Payment[], schoolYear: string): MonthStatus {
  if (payments.some(p => p.type === 'annual')) return 'paid'
  if (payments.some(p => p.type === 'monthly' && p.month === month)) return 'paid'
  return isMonthDue(month, schoolYear) ? 'unpaid' : 'upcoming'
}

export function inscriptionPaid(payments: Payment[]): boolean {
  return payments.some(p => p.type === 'inscription')
}

// Months already started and not paid
export function unpaidMonths(payments: Payment[], schoolYear: string): number[] {
  return SCHOOL_MONTHS.filter(m => monthStatus(m, payments, schoolYear) === 'unpaid')
}

// Last amount paid for this type — used to pre-fill the form
export function lastAmount(payments: Payment[], type: PaymentType): number | null {
  const p = [...payments].filter(x => x.type === type).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  return p ? p.amount : null
}

// Payments saved together (same student, same save) share created_at → one receipt
export function groupIntoReceipts(payments: Payment[]): Payment[][] {
  const map = new Map<string, Payment[]>()
  payments.forEach(p => {
    const k = `${p.student_id}|${p.created_at}`
    map.set(k, [...(map.get(k) ?? []), p])
  })
  return [...map.values()]
    .map(b => b.sort((a, c) => (a.month ?? 0) - (c.month ?? 0)))
    .sort((a, b) => b[0].created_at.localeCompare(a[0].created_at))
}

// Receipt number = R- + first 8 characters of the first payment's id on that receipt
export function receiptNumber(firstPaymentId: string): string {
  return 'R-' + firstPaymentId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function paymentLabel(p: Payment, lang: Lang): string {
  const t = T[lang]
  return p.type === 'monthly' ? `${t.monthly} — ${MONTH_NAMES[lang][p.month ?? 0]}`
    : p.type === 'annual' ? t.annual : t.inscription
}

// WhatsApp link: 06XXXXXXXX → 2126XXXXXXXX
export function whatsappLink(phone: string, message: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0'))  digits = '212' + digits.slice(1)
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function fmtMAD(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} MAD`
}

export function dateLocale(lang: Lang): string {
  return lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR'
}

// ── Receipt: opens a printable page → print or "Save as PDF" ──
function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function printReceipt(opts: {
  lang: Lang
  schoolName: string
  studentName: string
  massarCode?: string
  groupName?: string
  payments: Payment[]
}) {
  const { lang, schoolName, studentName, massarCode, groupName, payments } = opts
  if (payments.length === 0) return
  const t   = T[lang]
  const rtl = lang === 'ar'
  const first = payments[0]
  const total = payments.reduce((a, p) => a + p.amount, 0)
  const number = receiptNumber(first.id)
  const date = new Date(first.paid_at + 'T00:00:00').toLocaleDateString(dateLocale(lang))

  const rows = payments.map(p =>
    `<tr><td>${esc(paymentLabel(p, lang))}</td><td class="num"><bdi dir="ltr">${esc(fmtMAD(p.amount))}</bdi></td></tr>`).join('')

  const html = `<!doctype html><html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t.receipt)} ${number}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:24px;background:#fff}
  .r{max-width:560px;margin:0 auto;border:1px solid #cbd5e1;border-radius:10px;padding:28px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #1e40af;padding-bottom:14px}
  h1{font-size:20px;margin:0;color:#1e40af} .school{font-size:15px;font-weight:bold}
  .meta{font-size:12px;color:#475569;text-align:${rtl ? 'left' : 'right'};line-height:1.7}
  .info{margin:18px 0;font-size:13px;line-height:1.9} .info b{display:inline-block;min-width:120px;color:#475569;font-weight:normal}
  table{width:100%;border-collapse:collapse;font-size:13px} th,td{padding:9px 6px;border-bottom:1px solid #e2e8f0;text-align:${rtl ? 'right' : 'left'}}
  th{background:#f1f5f9;font-size:12px;color:#475569} .num{text-align:${rtl ? 'left' : 'right'};white-space:nowrap}
  .total td{font-weight:bold;font-size:14px;border-bottom:none;border-top:2px solid #0f172a}
  .sign{display:flex;justify-content:space-between;margin-top:36px;font-size:12px;color:#475569}
  .box{width:200px;height:80px;border:1px dashed #94a3b8;border-radius:6px;margin-top:6px}
  .foot{text-align:center;font-size:10px;color:#94a3b8;margin-top:24px}
  .btn{display:block;margin:18px auto 0;padding:10px 24px;background:#1e40af;color:#fff;border:0;border-radius:8px;font-size:14px;cursor:pointer}
  @media print{body{padding:0}.r{border:none}.btn{display:none}}
</style></head><body><div class="r">
<div class="head"><div><div class="school">${esc(schoolName)}</div><h1>${esc(t.receiptTitle)}</h1></div>
<div class="meta">${esc(t.receiptNo)}: <b><bdi dir="ltr">${number}</bdi></b><br>${esc(t.date)}: ${esc(date)}<br>${esc(t.schoolYear)}: <bdi dir="ltr">${esc(currentSchoolYear(new Date(first.paid_at + 'T00:00:00')))}</bdi></div></div>
<div class="info">
<div><b>${esc(t.student)}:</b> ${esc(studentName)}</div>
${massarCode ? `<div><b>${esc(t.massar)}:</b> ${esc(massarCode)}</div>` : ''}
${groupName ? `<div><b>${esc(t.group)}:</b> ${esc(groupName)}</div>` : ''}
<div><b>${esc(t.method)}:</b> ${esc(t[first.method])}</div>
</div>
<table><thead><tr><th>${esc(t.details)}</th><th class="num">${esc(t.amount)}</th></tr></thead>
<tbody>${rows}<tr class="total"><td>${esc(t.total)}</td><td class="num"><bdi dir="ltr">${esc(fmtMAD(total))}</bdi></td></tr></tbody></table>
${first.note ? `<p style="font-size:12px;color:#475569;margin-top:12px">${esc(first.note)}</p>` : ''}
<div class="sign"><div>${esc(t.stampSignature)}<div class="box"></div></div></div>
<div class="foot">Attendefy · attendefy.com</div>
<button class="btn" onclick="window.print()">${esc(t.printSave)}</button>
</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`

  const w = window.open('', '_blank')
  if (!w) { alert(t.popupBlocked); return }
  w.document.open(); w.document.write(html); w.document.close()
}

// ── Translations ──────────────────────────────────────────
export const T: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Paiements', subtitle: 'Frais de scolarité de l\'année',
    tabGrid: 'Paiements', tabUnpaid: 'Impayés',
    schoolYear: 'Année scolaire', allGroups: 'Tous les groupes', search: 'Rechercher un élève…',
    collectedYear: 'Encaissé (année)', collectedMonth: 'Encaissé ce mois', unpaidStudents: 'Élèves en retard',
    student: 'Élève', group: 'Groupe', massar: 'Code Massar', inscription: 'Inscription', monthly: 'Mensuel', annual: 'Annuel',
    paid: 'Payé', unpaid: 'Non payé', upcoming: 'À venir',
    save: 'Enregistrer', saved: 'Enregistré', saving: 'Enregistrement…', cancel: 'Annuler', close: 'Fermer',
    noStudents: 'Aucun élève.',
    recordPayment: 'Enregistrer un paiement', months: 'Mois',
    amount: 'Montant', amountPerMonth: 'Montant par mois', method: 'Mode de paiement', date: 'Date', note: 'Note (optionnel)',
    cash: 'Espèces', virement: 'Virement', cheque: 'Chèque',
    history: 'Historique', noPayments: 'Aucun paiement enregistré.', deletePayment: 'Supprimer',
    confirmDelete: 'Supprimer ce paiement ?', selectMonths: 'Choisissez au moins un mois.', enterAmount: 'Saisissez le montant.',
    alreadyPaid: 'Ce paiement existe déjà.', total: 'Total', allPaid: 'Tous les paiements sont à jour 🎉',
    remind: 'Rappel WhatsApp', noPhone: 'Pas de téléphone', unpaidMonths: 'Mois impayés',
    waMessage: 'Bonjour {parent}, nous vous rappelons que les frais de scolarité de {student} pour {months} restent à régler. Merci. — {school}',
    error: 'Erreur', yourPayments: 'Paiements', paidOn: 'payé le',
    receipt: 'Reçu', receiptTitle: 'Reçu de paiement', receiptNo: 'N°', details: 'Détail', stampSignature: 'Cachet et signature',
    printSave: 'Imprimer / Enregistrer en PDF', exportExcel: 'Télécharger Excel', popupBlocked: 'Autorisez les fenêtres pop-up pour afficher le reçu.',
  },
  en: {
    title: 'Payments', subtitle: 'School fees for the year',
    tabGrid: 'Payments', tabUnpaid: 'Unpaid',
    schoolYear: 'School year', allGroups: 'All groups', search: 'Search a student…',
    collectedYear: 'Collected (year)', collectedMonth: 'Collected this month', unpaidStudents: 'Students behind',
    student: 'Student', group: 'Group', massar: 'Massar code', inscription: 'Registration', monthly: 'Monthly', annual: 'Annual',
    paid: 'Paid', unpaid: 'Unpaid', upcoming: 'Upcoming',
    save: 'Save', saved: 'Saved', saving: 'Saving…', cancel: 'Cancel', close: 'Close',
    noStudents: 'No students.',
    recordPayment: 'Record a payment', months: 'Months',
    amount: 'Amount', amountPerMonth: 'Amount per month', method: 'Payment method', date: 'Date', note: 'Note (optional)',
    cash: 'Cash', virement: 'Bank transfer', cheque: 'Cheque',
    history: 'History', noPayments: 'No payments recorded.', deletePayment: 'Delete',
    confirmDelete: 'Delete this payment?', selectMonths: 'Select at least one month.', enterAmount: 'Enter the amount.',
    alreadyPaid: 'This payment already exists.', total: 'Total', allPaid: 'All payments are up to date 🎉',
    remind: 'WhatsApp reminder', noPhone: 'No phone', unpaidMonths: 'Unpaid months',
    waMessage: 'Hello {parent}, this is a reminder that the school fees for {student} for {months} are still due. Thank you. — {school}',
    error: 'Error', yourPayments: 'Payments', paidOn: 'paid on',
    receipt: 'Receipt', receiptTitle: 'Payment receipt', receiptNo: 'No.', details: 'Details', stampSignature: 'Stamp and signature',
    printSave: 'Print / Save as PDF', exportExcel: 'Download Excel', popupBlocked: 'Allow pop-ups to show the receipt.',
  },
  ar: {
    title: 'الأداءات', subtitle: 'واجبات التمدرس للسنة',
    tabGrid: 'الأداءات', tabUnpaid: 'غير المؤدى',
    schoolYear: 'السنة الدراسية', allGroups: 'جميع الفصول', search: 'البحث عن تلميذ…',
    collectedYear: 'المحصل (السنة)', collectedMonth: 'المحصل هذا الشهر', unpaidStudents: 'تلاميذ متأخرون',
    student: 'التلميذ', group: 'الفصل', massar: 'رمز مسار', inscription: 'التسجيل', monthly: 'شهري', annual: 'سنوي',
    paid: 'مؤدى', unpaid: 'غير مؤدى', upcoming: 'قادم',
    save: 'حفظ', saved: 'تم الحفظ', saving: 'جارٍ الحفظ…', cancel: 'إلغاء', close: 'إغلاق',
    noStudents: 'لا يوجد تلاميذ.',
    recordPayment: 'تسجيل أداء', months: 'الأشهر',
    amount: 'المبلغ', amountPerMonth: 'المبلغ لكل شهر', method: 'طريقة الأداء', date: 'التاريخ', note: 'ملاحظة (اختياري)',
    cash: 'نقداً', virement: 'تحويل بنكي', cheque: 'شيك',
    history: 'السجل', noPayments: 'لا توجد أداءات.', deletePayment: 'حذف',
    confirmDelete: 'حذف هذا الأداء؟', selectMonths: 'اختر شهراً واحداً على الأقل.', enterAmount: 'أدخل المبلغ.',
    alreadyPaid: 'هذا الأداء مسجل مسبقاً.', total: 'المجموع', allPaid: 'جميع الأداءات محينة 🎉',
    remind: 'تذكير واتساب', noPhone: 'لا يوجد هاتف', unpaidMonths: 'الأشهر غير المؤداة',
    waMessage: 'السلام عليكم {parent}، نذكركم بأن واجبات تمدرس {student} عن {months} لم تؤد بعد. شكراً. — {school}',
    error: 'خطأ', yourPayments: 'الأداءات', paidOn: 'أدي في',
    receipt: 'وصل', receiptTitle: 'وصل أداء', receiptNo: 'رقم', details: 'التفاصيل', stampSignature: 'الختم والتوقيع',
    printSave: 'طباعة / حفظ PDF', exportExcel: 'تحميل Excel', popupBlocked: 'اسمح بالنوافذ المنبثقة لعرض الوصل.',
  },
}