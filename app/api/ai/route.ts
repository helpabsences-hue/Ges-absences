// app/api/ai/route.ts
export const maxDuration = 60

import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import {
  type Payment, MONTH_NAMES, PAYMENT_COLUMNS, SCHOOL_MONTHS, currentSchoolYear, unpaidMonths,
} from '@/lib/payments'


function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY! })
}

// Tried in order — if Groq removes a model, the next one is used
const MODELS = [
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'groq/compound',
]

async function ask(prompt: string, system?: string): Promise<string> {
  const messages: any[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })

  for (const model of MODELS) {
    try {
      const completion = await getGroq().chat.completions.create({
        model,
        messages,
        max_tokens:  800,
        temperature: 0.7,
      } as any)
      const content = completion.choices[0]?.message?.content ?? ''
      return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    } catch (err: any) {
      if (err?.status === 404 || err?.error?.code === 'model_not_found' || err?.error?.code === 'model_decommissioned') {
        console.warn(`Model ${model} not available, trying next...`)
        continue
      }
      throw err
    }
  }
  throw new Error('No available Groq model found')
}

export async function POST(request: NextRequest) {
  const { type, payload } = await request.json()

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) {
    console.error('AI route auth error:', authError?.message ?? 'no user found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('role, school_id, name').eq('id', user.id).single()

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    switch (type) {
      case 'report':     return await generateReport(supabase, profile.school_id, payload)
      case 'chat':       return await handleChat(supabase, profile.school_id, payload, profile.name)
      case 'patterns':   return await detectPatterns(supabase, profile.school_id, payload)
      case 'prediction': return await predictRisk(supabase, profile.school_id, payload)
      default:           return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('AI error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── PAYMENTS — all totals computed here, the AI only explains them ──
async function buildPaymentSummary(supabase: any, school_id: string): Promise<string> {
  const schoolYear = currentSchoolYear()
  const [{ data: students }, { data: payments }] = await Promise.all([
    supabase.from('students').select('id, name, parent_name, parent_phone, groups(name)').eq('school_id', school_id),
    supabase.from('payments').select(PAYMENT_COLUMNS).eq('school_id', school_id).eq('school_year', schoolYear),
  ])
  const ps: Payment[] = (payments ?? []).map((p: any) => ({ ...p, amount: Number(p.amount) }))
  if (ps.length === 0) {
    return `\n\n=== PAIEMENTS (année ${schoolYear}) ===\nAucun paiement enregistré pour le moment.`
  }

  const M = MONTH_NAMES.fr
  const mad = (n: number) => `${Math.round(n)} MAD`
  const byStudent: Record<string, Payment[]> = {}
  ps.forEach(p => { (byStudent[p.student_id] ??= []).push(p) })

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const total = ps.reduce((a, p) => a + p.amount, 0)
  const totalThisMonth = ps.filter(p => p.paid_at.startsWith(thisMonth)).reduce((a, p) => a + p.amount, 0)

  // Collected per calendar month (date of payment)
  const perMonth: Record<string, number> = {}
  ps.forEach(p => { const k = p.paid_at.slice(0, 7); perMonth[k] = (perMonth[k] ?? 0) + p.amount })

  // Per method
  const methodName: Record<string, string> = { cash: 'Espèces', virement: 'Virement', cheque: 'Chèque' }
  const perMethod: Record<string, number> = {}
  ps.forEach(p => { perMethod[p.method] = (perMethod[p.method] ?? 0) + p.amount })

  // Per group
  const perGroup: Record<string, number> = {}
  const studentInfo: Record<string, any> = {}
  ;(students ?? []).forEach((s: any) => { studentInfo[s.id] = s })
  ps.forEach(p => {
    const g = studentInfo[p.student_id]?.groups?.name ?? '—'
    perGroup[g] = (perGroup[g] ?? 0) + p.amount
  })

  const annual: string[] = []
  const late: string[] = []
  const detail: string[] = []
  ;(students ?? []).forEach((s: any) => {
    const sp = byStudent[s.id] ?? []
    const group = s.groups?.name ?? '—'
    const unpaid = unpaidMonths(sp, schoolYear)
    if (sp.some(p => p.type === 'annual')) annual.push(`${s.name} (${group})`)
    if (unpaid.length > 0) {
      late.push(`${s.name} (${group}) — ${unpaid.length} mois: ${unpaid.map(m => M[m]).join(', ')} — parent: ${s.parent_name || '—'} ${s.parent_phone || ''}`.trim())
    }
    if (sp.length > 0) {
      const months = sp.filter(p => p.type === 'monthly').map(p => p.month as number)
        .sort((a, b) => SCHOOL_MONTHS.indexOf(a) - SCHOOL_MONTHS.indexOf(b)).map(m => M[m])
      const parts = [
        sp.some(p => p.type === 'inscription') ? 'inscription payée' : 'inscription non payée',
        sp.some(p => p.type === 'annual') ? 'annuel payé' : `mois payés: ${months.join(', ') || 'aucun'}`,
        `total payé: ${mad(sp.reduce((a, p) => a + p.amount, 0))}`,
      ]
      detail.push(`${s.name} (${group}): ${parts.join(' · ')}`)
    }
  })

  return [
    '',
    '',
    `=== PAIEMENTS — FRAIS DE SCOLARITÉ (année ${schoolYear}) ===`,
    'Règles: les écoles ne saisissent pas de tarifs, donc le MONTANT DÛ est inconnu. "En retard" = mois déjà commencé sans paiement. Une inscription non payée n\'est pas un retard (toutes les écoles n\'en demandent pas). Utilise uniquement les totaux ci-dessous, ne recalcule pas.',
    `Total encaissé cette année: ${mad(total)} | Encaissé ce mois-ci: ${mad(totalThisMonth)} | Nombre de paiements: ${ps.length}`,
    'Encaissé par mois (date de paiement): ' + Object.entries(perMonth).sort().map(([k, v]) => `${k}: ${mad(v)}`).join(' | '),
    'Par mode de paiement: ' + Object.entries(perMethod).map(([k, v]) => `${methodName[k] ?? k}: ${mad(v)}`).join(' | '),
    'Par classe: ' + Object.entries(perGroup).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${mad(v)}`).join(' | '),
    `Élèves ayant payé l'année complète (annuel) — ${annual.length}: ` + (annual.join(', ') || 'aucun'),
    `Élèves en retard de paiement — ${late.length}: ` + (late.join(' | ') || 'aucun'),
    'Détail des élèves ayant payé: ' + detail.join(' | '),
  ].join('\n')
}

// ── FETCH DATA — attendance + students + sessions + courses + groups ──
async function fetchData(supabase: any, school_id: string) {
  const { data } = await supabase
    .from('attendance')
    .select(`
      status,
      reason,
      students ( name, school_id, massar_code, parent_name, parent_email, parent_phone ),
      class_sessions (
        session_date,
        teacher_planning (
          school_id,
          start_time,
          end_time,
          courses ( name ),
          groups  ( name, year ),
          profiles ( name )
        )
      )
    `)
  // No limit — fetch all records, buildStats() compresses them

  const filtered = (data ?? []).filter((r: any) =>
    r.students?.school_id === school_id ||
    r.class_sessions?.teacher_planning?.school_id === school_id
  )

  return filtered as any[]
}

// ── FETCH RECENT — last 7 days ────────────────────────────────────────
async function fetchRecent(supabase: any, school_id: string) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const from = sevenDaysAgo.toISOString().split('T')[0]

  const { data } = await supabase
    .from('attendance')
    .select(`
      status, reason,
      students ( name ),
      class_sessions (
        session_date,
        teacher_planning (
          school_id,
          courses ( name ),
          groups  ( name ),
          profiles ( name )
        )
      )
    `)
    .gte('class_sessions.session_date', from)

  return (data ?? []).filter((r: any) =>
    r.class_sessions?.teacher_planning?.school_id === school_id
  ) as any[]
}

// ── FETCH ALERTS — how many alerts sent and to whom ──────────────────
async function fetchAlerts(supabase: any, school_id: string) {
  const { data } = await supabase
    .from('absence_alerts')
    .select('student_id, sent_at, absences, threshold')
    .eq('school_id', school_id)
  return (data ?? []) as any[]
}

// ── BUILD STATS — aggregate all data for prompt injection ─────────────
function buildStats(rows: any[], alerts: any[] = []) {
  const total    = rows.length
  const absents  = rows.filter(r => r.status === 'absent').length
  const lates    = rows.filter(r => r.status === 'late').length
  const presents = rows.filter(r => r.status === 'present').length

  // Per student
  const byStudent: Record<string, any> = {}
  for (const r of rows) {
    const name   = r.students?.name ?? 'Inconnu'
    if (!byStudent[name]) byStudent[name] = {
      name, absent: 0, late: 0, total: 0,
      days: [], subjects: {}, subjectDays: [],
      dates: [], byMonth: {},
      parentName:  r.students?.parent_name  ?? '—',
      parentEmail: r.students?.parent_email ?? '—',
      parentPhone: r.students?.parent_phone ?? '—',
      reasons: [],
    }
    byStudent[name].total++

    const date    = r.class_sessions?.session_date
    const course  = r.class_sessions?.teacher_planning?.courses?.name ?? '—'
    const teacher = r.class_sessions?.teacher_planning?.profiles?.name ?? '—'
    const dayName = date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' }) : ''
    const month   = date ? date.slice(0, 7) : ''

    if (r.status === 'absent') {
      byStudent[name].absent++
      if (dayName) byStudent[name].days.push(dayName)
      if (date)    byStudent[name].dates.push(`${date} ${course} (prof:${teacher})`)
      if (r.reason) byStudent[name].reasons.push(r.reason)
      if (month) {
        byStudent[name].byMonth[month] = (byStudent[name].byMonth[month] || 0) + 1
      }
      if (!byStudent[name].subjects[course]) byStudent[name].subjects[course] = 0
      byStudent[name].subjects[course]++
      if (dayName && course !== '—') {
        byStudent[name].subjectDays.push(`${course} (${dayName})`)
      }
    }
    if (r.status === 'late') byStudent[name].late++
  }

  // Per group (class)
  const byGroup: Record<string, any> = {}
  for (const r of rows) {
    const group = r.class_sessions?.teacher_planning?.groups?.name ?? 'Inconnu'
    if (!byGroup[group]) byGroup[group] = { total: 0, absent: 0 }
    byGroup[group].total++
    if (r.status === 'absent') byGroup[group].absent++
  }

  // Per course (subject)
  const byCourse: Record<string, any> = {}
  for (const r of rows) {
    const course = r.class_sessions?.teacher_planning?.courses?.name ?? 'Inconnu'
    if (!byCourse[course]) byCourse[course] = { total: 0, absent: 0 }
    byCourse[course].total++
    if (r.status === 'absent') byCourse[course].absent++
  }

  // Per day of week
  const byDay: Record<string, { total: number; absent: number }> = {}
  for (const r of rows) {
    const date = r.class_sessions?.session_date
    if (!date) continue
    const day = new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' })
    if (!byDay[day]) byDay[day] = { total: 0, absent: 0 }
    byDay[day].total++
    if (r.status === 'absent') byDay[day].absent++
  }
  const topDays = Object.entries(byDay)
    .map(([day, s]) => ({
      day, rate: s.total > 0 ? Math.round(s.absent / s.total * 100) : 0,
      absences: s.absent, total: s.total,
    }))
    .sort((a, b) => b.rate - a.rate)

  // Students absent together (same session/group)
  const absencesBySession: Record<string, string[]> = {}
  for (const r of rows) {
    if (r.status !== 'absent') continue
    const date  = r.class_sessions?.session_date ?? 'unknown'
    const group = r.class_sessions?.teacher_planning?.groups?.name ?? 'unknown'
    const key   = date + '_' + group
    if (!absencesBySession[key]) absencesBySession[key] = []
    absencesBySession[key].push(r.students?.name ?? 'Inconnu')
  }
  const groupAbsences = Object.entries(absencesBySession)
    .filter(([_, names]) => names.length >= 3)
    .map(([key, names]) => {
      const [date, group] = key.split('_')
      return { date, group, students: names, count: names.length }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  // Top groups by absence rate
  const topGroups = Object.entries(byGroup)
    .map(([name, s]: any) => ({
      name,
      rate: s.total > 0 ? Math.round(s.absent / s.total * 100) : 0,
      absences: s.absent,
      total: s.total,
    }))
    .filter(g => g.name !== 'Inconnu')
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)

  // Top courses by absence rate
  const topCourses = Object.entries(byCourse)
    .map(([name, s]: any) => ({
      name,
      rate: s.total > 0 ? Math.round(s.absent / s.total * 100) : 0,
      absences: s.absent,
      total: s.total,
    }))
    .filter(c => c.name !== 'Inconnu')
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5)

  return {
    total, absents, lates, presents,
    byStudent, byGroup, byCourse, byDay,
    topGroups, topCourses, topDays,
    groupAbsences,
    totalAlerts: alerts.length,
  }
}

// ── BUILD RICH SYSTEM PROMPT ─────────────────────────────────────────
function buildSystemPrompt(stats: any, adminName: string, langStr: string) {
  const { total, absents, lates, byStudent, topGroups, topCourses, totalAlerts } = stats
  const pct = (n: number) => total ? Math.round(n / total * 100) : 0

  const topAbsent = Object.values(byStudent)
    .sort((a: any, b: any) => b.absent - a.absent)
    .slice(0, 8)

  const atRisk = Object.values(byStudent)
    .filter((s: any) => s.total > 0 && s.absent / s.total > 0.25)

  return [
    'Tu es un assistant IA dans Attendefy (gestion des absences et des paiements scolaires).',
    'Tu aides ' + adminName + '. Réponds en ' + langStr + '. Sois concis et professionnel. Utilise **gras** pour les noms importants et • pour les listes. IMPORTANT: Utilise exactement les noms de jours fournis dans les données — ne les traduis pas ou ne les change pas.',
    '',
    '=== STATISTIQUES GÉNÉRALES ===',
    'Total relevés: ' + total + ' | Absences: ' + absents + ' (' + pct(absents) + '%) | Retards: ' + lates + ' | Présents: ' + stats.presents,
    '',
    '=== ÉTUDIANTS LES PLUS ABSENTS ===',
    topAbsent.map((s: any) => {
      const subjectSummary = Object.entries(s.subjects ?? {})
        .map(([subj, count]: any) => `${subj}(${count}x)`)
        .join(', ')
      const monthSummary = Object.entries(s.byMonth ?? {})
        .sort((a: any, b: any) => b[1] - a[1])
        .map(([month, count]: any) => `${month}:${count}abs`)
        .join(', ')
      const dateSummary = (s.dates ?? []).slice(0, 10).join(', ')
      const rate = s.total > 0 ? Math.round(s.absent / s.total * 100) : 0
      return `${s.name}: ${s.absent} abs/${s.total} séances (${rate}%)${subjectSummary ? ' — matières: ' + subjectSummary : ''}${monthSummary ? ' — par mois: ' + monthSummary : ''}${dateSummary ? ' — dates: ' + dateSummary : ''}`
    }).join(' | '),
    '',
    '=== TOUS LES ÉTUDIANTS (pour répondre aux questions spécifiques) ===',
    Object.values(byStudent).map((s: any) => {
      const subjects = Object.entries(s.subjects ?? {}).map(([subj, count]: any) => `${subj}:${count}x`).join(',')
      const months   = Object.entries(s.byMonth ?? {}).map(([m, c]: any) => `${m}:${c}`).join(',')
      const dates    = (s.dates ?? []).join(' | ')
      const reasons  = (s.reasons ?? []).length > 0 ? ` raisons:[${s.reasons.join(',')}]` : ''
      const parent   = `parent:${s.parentName}(${s.parentEmail}${s.parentPhone !== '—' ? '/' + s.parentPhone : ''})`
      return `${s.name}: ${s.absent}abs/${s.total}séances retards:${s.late} ${parent}${subjects ? ' matières[' + subjects + ']' : ''}${months ? ' mois[' + months + ']' : ''}${dates ? ' dates[' + dates + ']' : ''}${reasons}`
    }).join(' | '),
    '',
    '=== ÉTUDIANTS À RISQUE (>25%) ===',
    atRisk.length > 0
      ? atRisk.map((s: any) => {
          const rate = Math.round(s.absent/s.total*100)
          const topSubject = Object.entries(s.subjects ?? {})
            .sort((a: any, b: any) => b[1] - a[1])[0]
          return `${s.name} (${rate}%)${topSubject ? ' — plus absent en: ' + topSubject[0] : ''}`
        }).join(', ')
      : 'Aucun étudiant à risque détecté',
    '',
    '=== CLASSES LES PLUS ABSENTÉISTES ===',
    topGroups.length > 0
      ? topGroups.map((g: any) => g.name + ': ' + g.rate + '% (' + g.absences + ' abs/' + g.total + ')').join(' | ')
      : 'Aucune donnée de classe',
    '',
    '=== MATIÈRES LES PLUS ABSENTÉISTES ===',
    topCourses.length > 0
      ? topCourses.map((c: any) => c.name + ': ' + c.rate + '% (' + c.absences + ' abs/' + c.total + ')').join(' | ')
      : 'Aucune donnée de matière',
    '',
    '=== ABSENCES PAR JOUR DE LA SEMAINE ===',
    stats.topDays && stats.topDays.length > 0
      ? stats.topDays.map((d: any) => d.day + ': ' + d.rate + '% abs (' + d.absences + '/' + d.total + ' séances)').join(' | ')
      : 'Pas encore assez de données par jour',
    stats.topDays && stats.topDays.length > 0
      ? 'Jour avec le plus d\'absences: ' + stats.topDays[0]?.day + ' (' + stats.topDays[0]?.rate + '%)'
      : '',
    '',
    '=== ABSENCES COLLECTIVES (étudiants absents ensemble) ===',
    stats.groupAbsences && stats.groupAbsences.length > 0
      ? stats.groupAbsences.map((g: any) =>
          'Le ' + g.date + ' (' + g.group + '): ' + g.count + ' étudiants absents ensemble → ' + g.students.join(', ')
        ).join(' | ')
      : 'Aucune absence collective détectée (3+ étudiants le même jour dans le même groupe)',
    '',
    '=== ALERTES PARENTS ===',
    'Total alertes envoyées aux parents depuis le début: ' + totalAlerts,
    '',
    'IMPORTANT: Réponds uniquement à partir de ces données. Ne génère jamais de chiffres que tu ne vois pas ici.',
  ].join('\n')
}

// ── GENERATE REPORT ──────────────────────────────────────────────────
async function generateReport(supabase: any, school_id: string, payload: any) {
  const { dateFrom, dateTo, lang = 'fr' } = payload
  const rows    = await fetchData(supabase, school_id)
  const alerts  = await fetchAlerts(supabase, school_id)
  const stats   = buildStats(rows, alerts)
  const langStr = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'
  const pct     = (n: number) => stats.total ? Math.round(n / stats.total * 100) : 0

  const topAbsent = Object.values(stats.byStudent).sort((a: any, b: any) => b.absent - a.absent).slice(0, 5)
  const atRisk    = Object.values(stats.byStudent).filter((s: any) => s.total > 0 && s.absent / s.total > 0.3)

  const prompt = [
    'Tu es un conseiller pédagogique. Rédige un rapport mensuel professionnel en ' + langStr + '.',
    '',
    'Période: ' + (dateFrom ?? 'début') + ' → ' + (dateTo ?? "aujourd'hui"),
    'Total: ' + stats.total + ' | Présents: ' + stats.presents + ' (' + pct(stats.presents) + '%) | Absents: ' + stats.absents + ' (' + pct(stats.absents) + '%) | Retards: ' + stats.lates,
    'Top 5 absents: ' + topAbsent.map((s: any) => s.name + ': ' + s.absent + ' abs/' + s.total).join(', '),
    'Étudiants à risque (>30%): ' + atRisk.map((s: any) => s.name + ' (' + Math.round(s.absent/s.total*100) + '%)').join(', '),
    'Classe la plus absentéiste: ' + (stats.topGroups[0]?.name ?? 'N/A') + ' (' + (stats.topGroups[0]?.rate ?? 0) + '%)',
    'Matière la plus absentéiste: ' + (stats.topCourses[0]?.name ?? 'N/A') + ' (' + (stats.topCourses[0]?.rate ?? 0) + '%)',
    'Alertes parents envoyées: ' + stats.totalAlerts,
    '',
    'Structure: résumé exécutif, analyse par classe et matière, étudiants préoccupants, recommandations.',
  ].join('\n')

  const report = await ask(prompt)
  return NextResponse.json({
    report,
    stats: {
      total: stats.total,
      presents: stats.presents,
      absents: stats.absents,
      lates: stats.lates,
      atRisk: atRisk.length,
      totalAlerts: stats.totalAlerts,
    }
  })
}

// ── HANDLE CHAT ──────────────────────────────────────────────────────
async function handleChat(supabase: any, school_id: string, payload: any, adminName: string) {
  const { messages, lang = 'fr' } = payload
  const [rows, recent, alerts, paymentSummary] = await Promise.all([
    fetchData(supabase, school_id),
    fetchRecent(supabase, school_id),
    fetchAlerts(supabase, school_id),
    buildPaymentSummary(supabase, school_id).catch(() => ''),
  ])
  const stats   = buildStats(rows, alerts)
  const langStr = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'

  // Build recent 7 days summary
  const recentAbsents = recent.filter((r: any) => r.status === 'absent')
  const recentSummary = recentAbsents.slice(0, 50).map((r: any) => {
    const student = r.students?.name ?? '—'
    const course  = r.class_sessions?.teacher_planning?.courses?.name ?? '—'
    const teacher = r.class_sessions?.teacher_planning?.profiles?.name ?? '—'
    const date    = r.class_sessions?.session_date ?? '—'
    const dayName = date !== '—' ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : date
    const reason  = r.reason ? ` raison:${r.reason}` : ''
    return `${dayName} (${date}) — ${student} absent en ${course} (prof:${teacher})${reason}`
  }).join(' | ')

  const system = buildSystemPrompt(stats, adminName, langStr) +
    `\n\n=== ABSENCES DES 7 DERNIERS JOURS (${recentAbsents.length} absences) ===\n` +
    (recentSummary || 'Aucune absence récente') +
    paymentSummary

  const history = messages.slice(0, -1)
    .map((m: any) => (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.content)
    .join('\n')
  const lastMsg = messages[messages.length - 1]?.content ?? ''
  const prompt  = history ? history + '\nUser: ' + lastMsg : lastMsg

  const reply = await ask(prompt, system)
  return NextResponse.json({ reply })
}

// ── DETECT PATTERNS ──────────────────────────────────────────────────
async function detectPatterns(supabase: any, school_id: string, payload: any) {
  const { lang = 'fr' } = payload
  const rows    = await fetchData(supabase, school_id)
  const alerts  = await fetchAlerts(supabase, school_id)
  const stats   = buildStats(rows, alerts)
  const langStr = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'

  const byDay: Record<string, number> = {}
  for (const s of Object.values(stats.byStudent)) {
    for (const day of (s as any).days) {
      byDay[day] = (byDay[day] ?? 0) + 1
    }
  }

  const worstDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0] ?? null
  const atRisk   = Object.values(stats.byStudent).filter((s: any) => s.total > 0 && s.absent / s.total > 0.25)

  const prompt = [
    'Analyse ces données et identifie les patterns. Réponds en ' + langStr + '.',
    'Jour le plus problématique: ' + (worstDay?.[0] ?? 'N/A') + ' (' + (worstDay?.[1] ?? 0) + ' absences)',
    'Répartition par jour: ' + Object.entries(byDay).map(([d, n]) => d + ':' + n).join(', '),
    'Classe la plus absentéiste: ' + (stats.topGroups[0]?.name ?? 'N/A') + ' (' + (stats.topGroups[0]?.rate ?? 0) + '%)',
    'Matière la plus absentéiste: ' + (stats.topCourses[0]?.name ?? 'N/A') + ' (' + (stats.topCourses[0]?.rate ?? 0) + '%)',
    'Étudiants à risque (>25%): ' + atRisk.length,
  ].join('\n')

  const insights = await ask(prompt)
  return NextResponse.json({
    insights,
    patterns: [],
    atRisk: atRisk.length,
    worstDay,
    topGroups: stats.topGroups,
    topCourses: stats.topCourses,
  })
}

// ── PREDICT RISK ─────────────────────────────────────────────────────
async function predictRisk(supabase: any, school_id: string, payload: any) {
  const { lang = 'fr' } = payload
  const langStr    = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'
  const ML_API_URL = process.env.ML_API_URL

  // Try the trained Random Forest model first
  if (ML_API_URL) {
    try {
      const res = await fetch(ML_API_URL + '/predict', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ school_id }),
        signal:  AbortSignal.timeout(55000),
      })

      if (res.ok) {
        const data = await res.json()

        if (data.success) {
          const highRisk = (data.students || []).filter((s: any) => s.risk_level === 'high').slice(0, 5)

          const prompt = [
            'Tu es un conseiller pédagogique. Voici les résultats du modèle ML de prédiction de décrochage scolaire.',
            'Donne des recommandations concrètes pour les étudiants à risque élevé. Réponds en ' + langStr + '.',
            '',
            'Résumé: ' + data.at_risk_high + ' étudiants à risque élevé sur ' + data.total,
            'Top étudiants à risque: ' + highRisk.map((s: any) =>
              s.student_name + ' (' + s.absence_rate + '% abs, score: ' + s.risk_score + '%)'
            ).join(', '),
          ].join('\n')

          const explanation = await ask(prompt)

          return NextResponse.json({
            prediction:     explanation,
            students:       data.students,
            total:          data.total,
            at_risk_high:   data.at_risk_high,
            at_risk_medium: data.at_risk_medium,
            source:         'ml_model',
          })
        }
      } else {
        const errText = await res.text()
        console.error('ML API responded with error:', res.status, errText)
      }
    } catch (err: any) {
      console.error('ML API call failed:', err.message)
    }
  } else {
    console.error('ML_API_URL env var is not set — using Groq fallback')
  }

  // Fallback: Groq estimation
  const rows   = await fetchData(supabase, school_id)
  const alerts = await fetchAlerts(supabase, school_id)
  const stats  = buildStats(rows, alerts)

  const allStudents = Object.values(stats.byStudent).map((s: any) => {
    const absenceRate = s.total > 0 ? Math.round(s.absent / s.total * 100) : 0
    const risk_level  = absenceRate >= 30 ? 'high' : absenceRate >= 15 ? 'medium' : 'low'
    return {
      student_id:      s.name,
      student_name:    s.name,
      massar_code:     '',
      group_name:      '',
      absence_rate:    absenceRate,
      late_rate:       s.total > 0 ? Math.round(s.late / s.total * 100) : 0,
      attendance_rate: s.total > 0 ? Math.round((s.total - s.absent - s.late) / s.total * 100) : 0,
      risk_score:      absenceRate,
      risk_level,
      absences:        s.absent,
      total_sessions:  s.total,
    }
  }).sort((a: any, b: any) => b.risk_score - a.risk_score)

  const atRiskHigh   = allStudents.filter((s: any) => s.risk_level === 'high').length
  const atRiskMedium = allStudents.filter((s: any) => s.risk_level === 'medium').length
  const top15        = allStudents.filter((s: any) => s.absence_rate > 15).slice(0, 15)

  const prompt = [
    'Tu es un conseiller pédagogique. Analyse ces étudiants et identifie lesquels sont à risque.',
    'Pour chacun donne des recommandations concrètes. Réponds en ' + langStr + '.',
    '',
    JSON.stringify(top15.map((s: any) => ({
      name: s.student_name, absenceRate: s.absence_rate,
      absences: s.absences, sessions: s.total_sessions,
    })), null, 2),
  ].join('\n')

  const prediction = await ask(prompt)

  return NextResponse.json({
    prediction,
    students:       allStudents,
    total:          allStudents.length,
    at_risk_high:   atRiskHigh,
    at_risk_medium: atRiskMedium,
    source:         'groq_fallback',
  })
}