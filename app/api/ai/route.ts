// app/api/ai/route.ts
import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const MODEL = 'llama-3.3-70b-versatile'

async function ask(prompt: string, system?: string): Promise<string> {
  const messages: any[] = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: prompt })
  const completion = await groq.chat.completions.create({
    model: MODEL, messages, max_tokens: 1500, temperature: 0.7,
  })
  return completion.choices[0]?.message?.content ?? ''
}

export async function POST(request: NextRequest) {
  const { type, payload } = await request.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

// ── Fetch attendance via school_id through the join chain ──────────
// attendance has no school_id — must go through:
// attendance → class_sessions → teacher_planning → school_id
async function fetchData(supabase: any, school_id: string) {
  // Step 1: get all planning IDs for this school
  const { data: plannings } = await supabase
    .from('teacher_planning')
    .select('id')
    .eq('school_id', school_id)

  if (!plannings || plannings.length === 0) return []

  const planningIds = plannings.map((p: any) => p.id)

  // Step 2: get all sessions for these plannings
  const { data: sessions } = await supabase
    .from('class_sessions')
    .select('id, session_date, planning_id, teacher_planning(courses(name), groups(name, year))')
    .in('planning_id', planningIds)

  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map((s: any) => s.id)
  const sessionMap: Record<string, any> = {}
  sessions.forEach((s: any) => { sessionMap[s.id] = s })

  // Step 3: get all attendance for these sessions
  const { data: attendance } = await supabase
    .from('attendance')
    .select('session_id, student_id, status, students(name)')
    .in('session_id', sessionIds)

  if (!attendance) return []

  // Merge session info into attendance records
  return attendance.map((a: any) => ({
    ...a,
    session: sessionMap[a.session_id],
  }))
}

function buildStats(rows: any[]) {
  const total    = rows.length
  const absents  = rows.filter(r => r.status === 'absent').length
  const lates    = rows.filter(r => r.status === 'late').length
  const presents = rows.filter(r => r.status === 'present').length

  const byStudent: Record<string, {
    name: string; absent: number; late: number; total: number; days: string[]
  }> = {}

  for (const r of rows) {
    const name = r.students?.name ?? 'Inconnu'
    if (!byStudent[name]) byStudent[name] = { name, absent: 0, late: 0, total: 0, days: [] }
    byStudent[name].total++
    if (r.status === 'absent') {
      byStudent[name].absent++
      const date = r.session?.session_date
      if (date) {
        const day = new Date(date).toLocaleDateString('en', { weekday: 'long' })
        byStudent[name].days.push(day)
      }
    }
    if (r.status === 'late') byStudent[name].late++
  }

  return { total, absents, lates, presents, byStudent }
}

async function generateReport(supabase: any, school_id: string, payload: any) {
  const { dateFrom, dateTo, lang = 'fr' } = payload
  const rows = await fetchData(supabase, school_id)
  const { total, absents, lates, presents, byStudent } = buildStats(rows)

  const topAbsent = Object.values(byStudent).sort((a, b) => b.absent - a.absent).slice(0, 5)
  const atRisk    = Object.values(byStudent).filter(s => s.total > 0 && s.absent / s.total > 0.3)
  const langStr   = lang === 'ar' ? 'en arabe' : lang === 'en' ? 'in English' : 'en français'
  const pct       = (n: number) => total ? Math.round(n / total * 100) : 0

  const prompt = [
    'Tu es un conseiller pédagogique. Rédige un rapport mensuel professionnel ' + langStr + '.',
    'Période: ' + (dateFrom ?? 'début') + ' → ' + (dateTo ?? "aujourd'hui"),
    'Total: ' + total + ' | Présents: ' + presents + ' (' + pct(presents) + '%) | Absents: ' + absents + ' (' + pct(absents) + '%) | Retards: ' + lates,
    'Top 5 absences: ' + topAbsent.map(s => s.name + ': ' + s.absent + ' abs/' + s.total + ' séances').join(', '),
    'À risque (>30%): ' + atRisk.map(s => s.name + ' (' + Math.round(s.absent / s.total * 100) + '%)').join(', '),
    'Structure: résumé exécutif, analyse, étudiants préoccupants, recommandations.',
  ].join('\n')

  const report = await ask(prompt)
  return NextResponse.json({ report, stats: { total, presents, absents, lates, atRisk: atRisk.length } })
}

async function handleChat(supabase: any, school_id: string, payload: any, adminName: string) {
  const { messages, lang = 'fr' } = payload
  const rows = await fetchData(supabase, school_id)
  const { total, absents, lates, byStudent } = buildStats(rows)

  const topAbsent = Object.values(byStudent).sort((a: any, b: any) => b.absent - a.absent).slice(0, 10)
  const atRisk    = Object.values(byStudent).filter((s: any) => s.total > 0 && s.absent / s.total > 0.25)
  const langStr   = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'

  const system = [
    'Tu es un assistant IA dans Attendify (gestion absences scolaires).',
    'Tu aides ' + adminName + '. Réponds en ' + langStr + '. Sois concis et professionnel.',
    'Données réelles de l\'école:',
    'Total relevés: ' + total + ' | Absences: ' + absents + ' (' + (total ? Math.round(absents / total * 100) : 0) + '%) | Retards: ' + lates,
    'Top absents: ' + topAbsent.map((s: any) => s.name + ' (' + s.absent + ' abs)').join(', '),
    'À risque (>25%): ' + (atRisk.map((s: any) => s.name + ' (' + Math.round(s.absent / s.total * 100) + '%)').join(', ') || 'aucun'),
  ].join('\n')

  const history = messages.slice(0, -1)
    .map((m: any) => (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.content)
    .join('\n')
  const lastMsg = messages[messages.length - 1]?.content ?? ''
  const prompt  = history ? history + '\nUser: ' + lastMsg : lastMsg

  const reply = await ask(prompt, system)
  return NextResponse.json({ reply })
}

async function detectPatterns(supabase: any, school_id: string, payload: any) {
  const { lang = 'fr' } = payload
  const rows = await fetchData(supabase, school_id)
  const { byStudent } = buildStats(rows)

  const byDay: Record<string, number> = {}
  for (const s of Object.values(byStudent)) {
    for (const day of s.days) {
      byDay[day] = (byDay[day] ?? 0) + 1
    }
  }

  const worstDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0] ?? null
  const atRisk   = Object.values(byStudent).filter(s => s.total > 0 && s.absent / s.total > 0.25)
  const langStr  = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'

  const prompt = [
    'Analyse ces données et identifie les patterns d\'absences. Réponds en ' + langStr + '.',
    'Jour le plus problématique: ' + (worstDay?.[0] ?? 'N/A') + ' (' + (worstDay?.[1] ?? 0) + ' absences)',
    'Répartition par jour: ' + Object.entries(byDay).map(([d, n]) => d + ':' + n).join(', '),
    'Étudiants à risque (>25%): ' + atRisk.length,
    'Détail: ' + atRisk.map(s => s.name + '(' + Math.round(s.absent / s.total * 100) + '%)').join(', '),
  ].join('\n')

  const insights = await ask(prompt)
  return NextResponse.json({ insights, patterns: [], atRisk: atRisk.length, worstDay })
}

async function predictRisk(supabase: any, school_id: string, payload: any) {
  const { lang = 'fr' } = payload
  const rows = await fetchData(supabase, school_id)
  const { byStudent } = buildStats(rows)

  const students = Object.values(byStudent)
    .map(s => ({
      name:        s.name,
      absenceRate: s.total > 0 ? Math.round(s.absent / s.total * 100) : 0,
      absences:    s.absent,
      lates:       s.late,
      sessions:    s.total,
    }))
    .filter(s => s.absenceRate > 15)
    .sort((a, b) => b.absenceRate - a.absenceRate)
    .slice(0, 15)

  const langStr = lang === 'ar' ? 'arabe' : lang === 'en' ? 'anglais' : 'français'
  const prompt  = [
    'Tu es un conseiller pédagogique. Analyse ces étudiants et prédi lesquels sont à risque de décrochage.',
    'Pour chacun donne des recommandations concrètes. Réponds en ' + langStr + '.',
    JSON.stringify(students, null, 2),
  ].join('\n')

  const prediction = await ask(prompt)
  return NextResponse.json({ prediction, students })
}