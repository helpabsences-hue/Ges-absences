'use client'
// app/teacher/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { useAttendanceStore } from '@/stores/useAttendanceStore'
import { useAuthStore }       from '@/stores/useAuthStore'
import { createClient }       from '@/lib/supabase/client'
import ScheduleCard            from '@/components/teacher/ScheduleCard'
import AttendanceModal         from '@/components/teacher/AttendanceModal'
import type { TeacherPlanningFull, Day } from '@/types'

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getTodayName(): Day {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return names[new Date().getDay()] as Day
}

// ── Historique types ──────────────────────────────────────
interface SessionHistory {
  id:          string
  session_date: string
  groupName:   string
  courseName:  string
  startTime:   string
  endTime:     string
  total:       number
  present:     number
  absent:      number
  late:        number
}

type Tab = 'today' | 'week' | 'history'

const STATUS_DOT: Record<string, string> = {
  present: 'bg-green-400',
  absent:  'bg-red-400',
  late:    'bg-yellow-400',
}

export default function TeacherPage() {
  const { profile } = useAuthStore()
  const {
    todaySlots, allSlots,
    scheduleLoading, sessionLoading,
    activeSession,
    fetchSchedule, startSession,
  } = useAttendanceStore()

  const [tab,       setTab]       = useState<Tab>('today')
  const [history,   setHistory]   = useState<SessionHistory[]>([])
  const [histLoad,  setHistLoad]  = useState(false)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  // Per-session student details
  const [details,   setDetails]   = useState<Record<string, any[]>>({})

  const todayName = getTodayName()

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  // ── Fetch history when tab opens ──────────────────────
  const fetchHistory = useCallback(async () => {
    setHistLoad(true)
    const supabase = createClient()
    const uid = profile?.id
    if (!uid) { setHistLoad(false); return }

    const { data: sessions } = await supabase
      .from('class_sessions')
      .select(`
        id, session_date,
        teacher_planning!inner (
          teacher_id, start_time, end_time,
          groups  ( name ),
          courses ( name )
        ),
        attendance ( status )
      `)
      .eq('teacher_planning.teacher_id', uid)
      .order('session_date', { ascending: false })
      .limit(50)

    if (!sessions) { setHistLoad(false); return }

    const rows: SessionHistory[] = sessions.map((s: any) => {
      const tp       = s.teacher_planning
      const records  = s.attendance ?? []
      const present  = records.filter((r: any) => r.status === 'present').length
      const absent   = records.filter((r: any) => r.status === 'absent').length
      const late     = records.filter((r: any) => r.status === 'late').length
      return {
        id:           s.id,
        session_date: s.session_date,
        groupName:    tp?.groups?.name  ?? '—',
        courseName:   tp?.courses?.name ?? '—',
        startTime:    tp?.start_time?.slice(0, 5) ?? '',
        endTime:      tp?.end_time?.slice(0, 5)   ?? '',
        total:        records.length,
        present, absent, late,
      }
    })

    setHistory(rows)
    setHistLoad(false)
  }, [profile?.id])

  useEffect(() => {
    if (tab === 'history') fetchHistory()
  }, [tab, fetchHistory])

  // ── Expand session: load student details ──────────────
  const toggleExpand = async (sessionId: string) => {
    if (expanded === sessionId) { setExpanded(null); return }
    setExpanded(sessionId)
    if (details[sessionId]) return // already loaded

    const supabase = createClient()
    const { data } = await supabase
      .from('attendance')
      .select('status, reason, students ( name, massar_code )')
      .eq('session_id', sessionId)
      .order('students(name)')

    setDetails((prev) => ({ ...prev, [sessionId]: data ?? [] }))
  }

  // Group allSlots by day
  const byDay = DAYS.reduce<Record<Day, TeacherPlanningFull[]>>(
    (acc, day) => { acc[day] = allSlots.filter((s) => s.day === day); return acc },
    {} as Record<Day, TeacherPlanningFull[]>
  )

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const dateStr  = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Greeting */}
      <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/5 border border-blue-500/20 rounded-2xl px-6 py-5">
        <p className="text-slate-400 text-sm">{dateStr}</p>
        <h1 className="text-xl font-bold text-white mt-1">
          {greeting}, {profile?.name?.split(' ')[0] ?? 'Teacher'} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {todaySlots.length === 0
            ? 'No classes scheduled for today.'
            : `You have ${todaySlots.length} class${todaySlots.length !== 1 ? 'es' : ''} today.`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-white">{todaySlots.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Today</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-white">{allSlots.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">This week</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-white">{new Set(allSlots.map((s) => s.group_id)).size}</p>
          <p className="text-xs text-slate-500 mt-0.5">Groups</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {([
          { key: 'today',   label: 'Today',     badge: todaySlots.length > 0 ? todaySlots.length : null },
          { key: 'week',    label: 'Full Week',  badge: null },
          { key: 'history', label: 'Historique', badge: null },
        ] as const).map(({ key, label, badge }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}>
            {label}
            {badge && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === key ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      {scheduleLoading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

      ) : tab === 'today' ? (
        todaySlots.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl py-14 text-center">
            <p className="text-slate-400 font-medium">No classes today</p>
            <p className="text-slate-600 text-sm mt-1">Switch to Full Week to see your schedule</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySlots.map((slot) => (
              <ScheduleCard key={slot.id} slot={slot} isToday onStart={startSession} loading={sessionLoading} />
            ))}
          </div>
        )

      ) : tab === 'week' ? (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const slots   = byDay[day]
            const isToday = day === todayName
            return (
              <div key={day} className={`bg-slate-900 border rounded-2xl overflow-hidden ${isToday ? 'border-blue-500/30' : 'border-slate-800'}`}>
                <div className={`px-5 py-3 border-b flex items-center gap-2 ${isToday ? 'border-blue-500/20 bg-blue-500/5' : 'border-slate-800'}`}>
                  <h3 className={`text-sm font-semibold ${isToday ? 'text-blue-400' : 'text-slate-300'}`}>{day}</h3>
                  {isToday && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">Today</span>}
                  <span className="text-xs text-slate-600 ml-auto">{slots.length} class{slots.length !== 1 ? 'es' : ''}</span>
                </div>
                {slots.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-slate-600">No classes</div>
                ) : (
                  <div className="p-3 space-y-2">
                    {slots.map((slot) => (
                      <ScheduleCard key={slot.id} slot={slot} isToday={isToday} onStart={startSession} loading={sessionLoading} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      ) : (
        /* ── Historique tab ───────────────────────────── */
        histLoad ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl py-14 text-center">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No sessions recorded yet</p>
            <p className="text-slate-600 text-sm mt-1">Past attendance sessions will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((s) => {
              const rate      = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
              const rateColor = rate >= 85 ? 'text-green-400' : rate >= 70 ? 'text-yellow-400' : 'text-red-400'
              const isOpen    = expanded === s.id
              const studs     = details[s.id] ?? []

              return (
                <div key={s.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition">

                  {/* Row header — click to expand */}
                  <button onClick={() => toggleExpand(s.id)} className="w-full text-left px-5 py-4 flex items-center gap-4">

                    {/* Date */}
                    <div className="shrink-0 w-14 text-center">
                      <p className="text-lg font-bold text-white leading-none">
                        {new Date(s.session_date).getDate()}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(s.session_date).toLocaleDateString('fr-FR', { month: 'short' })}
                      </p>
                      <p className="text-xs text-slate-600">
                        {new Date(s.session_date).getFullYear()}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 bg-slate-800 shrink-0" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{s.courseName}</p>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">{s.groupName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{s.startTime} – {s.endTime}</p>
                    </div>

                    {/* Mini attendance pills */}
                    <div className="shrink-0 flex items-center gap-2">
                      {s.total > 0 ? (
                        <>
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />{s.present}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{s.absent}
                          </span>
                          {s.late > 0 && (
                            <span className="flex items-center gap-1 text-xs text-yellow-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />{s.late}
                            </span>
                          )}
                          <span className={`text-sm font-bold ${rateColor} ml-1`}>{rate}%</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-600 italic">No records</span>
                      )}
                      {/* Chevron */}
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ml-1 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded student list */}
                  {isOpen && (
                    <div className="border-t border-slate-800 px-5 py-3">
                      {studs.length === 0 ? (
                        <p className="text-xs text-slate-600 italic py-2">No attendance records for this session</p>
                      ) : (
                        <div className="space-y-1.5">
                          {studs.map((a: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 py-1">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? 'bg-slate-600'}`} />
                              <span className="text-sm text-white flex-1">{a.students?.name ?? '—'}</span>
                              <span className="text-xs font-mono text-slate-500">{a.students?.massar_code ?? ''}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                a.status === 'present' ? 'bg-green-500/10 text-green-400' :
                                a.status === 'absent'  ? 'bg-red-500/10  text-red-400'   :
                                                         'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                {a.status === 'present' ? 'Présent' : a.status === 'absent' ? 'Absent' : 'Retard'}
                              </span>
                              {a.reason && (
                                <span className="text-xs text-slate-500 italic max-w-[120px] truncate">{a.reason}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {activeSession && <AttendanceModal />}
    </div>
  )
}