// app/api/ai/route.ts
export const maxDuration = 60

import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const MODEL = 'qwen/qwen3.6-27b'

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY! })
}

async function ask(prompt: string, system?: string): Promise<string> {
  const messages: any[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages,
    max_tokens:  800,
    temperature: 0.7,
    reasoning_effort: 'none', // disable thinking blocks
  } as any)
  const content = completion.choices[0]?.message?.content ?? ''
  // Strip any <think>...</think> blocks just in case
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
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

  if (!profile || profile.role === 'teacher') {
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

// ── FETCH DATA — attendance + students + sessions + courses + groups ──
async function fetchData(supabase: any, school_id: string) {
  const { data } = await supabase
    .from('attendance')
    .select(`
      status,
      students ( name, school_id, massar_code ),
      class_sessions (
        session_date,
        teacher_planning (
          school_id,
          start_time,
          end_time,
          courses ( name ),
          groups  ( name, year )
        )
      )
    `)
    .limit(1000)

  const filtered = (data ?? []).filter((r: any) =>
    r.students?.school_id === school_id ||
    r.class_sessions?.teacher_planning?.school_id === school_id
  )

  return filtered as any[]
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
    const name = r.students?.name ?? 'Inconnu'
    if (!byStudent[name]) byStudent[name] = {
      name, absent: 0, late: 0, total: 0,
      days: [], subjects: {}, subjectDays: []
    }
    byStudent[name].total++

    const date    = r.class_sessions?.session_date
    const course  = r.class_sessions?.teacher_planning?.courses?.name ?? '—'
    const dayName = date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long' }) : ''

    if (r.status === 'absent') {
      byStudent[name].absent++
      if (dayName) byStudent[name].days.push(dayName)
      // Track per subject
      if (!byStudent[name].subjects[course]) byStudent[name].subjects[course] = 0
      byStudent[name].subjects[course]++
      // Track subject + day combo
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
    const day = new Date(date).toLocaleDateString('en', { weekday: 'long' })
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
    'Tu es un assistant IA dans Attendefy (gestion absences scolaires).',
    'Tu aides ' + adminName + '. Réponds en ' + langStr + '. Sois concis et professionnel.',
    '',
    '=== STATISTIQUES GÉNÉRALES ===',
    'Total relevés: ' + total + ' | Absences: ' + absents + ' (' + pct(absents) + '%) | Retards: ' + lates + ' | Présents: ' + stats.presents,
    '',
    '=== ÉTUDIANTS LES PLUS ABSENTS ===',
    topAbsent.map((s: any) => {
      const subjectSummary = Object.entries(s.subjects ?? {})
        .map(([subj, count]: any) => `${subj}(${count}x)`)
        .join(', ')
      const rate = s.total > 0 ? Math.round(s.absent / s.total * 100) : 0
      return `${s.name}: ${s.absent} abs/${s.total} séances (${rate}%)${subjectSummary ? ' — matières: ' + subjectSummary : ''}`
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
  const rows    = await fetchData(supabase, school_id)
  const alerts  = await fetchAlerts(supabase, school_id)
  const stats   = buildStats(rows, alerts)
  const langStr = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'

  const system = buildSystemPrompt(stats, adminName, langStr)

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