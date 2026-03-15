'use client'
// app/teacher/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { useAttendanceStore } from '@/stores/useAttendanceStore'
import { useAuthStore }       from '@/stores/useAuthStore'
import { useSettingsStore }   from '@/stores/useSettingsStore'
import { createClient }       from '@/lib/supabase/client'
import ScheduleCard            from '@/components/teacher/ScheduleCard'
import AttendanceModal         from '@/components/teacher/AttendanceModal'
import type { TeacherPlanningFull, Day } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  greetMorning: string; greetAfternoon: string; greetEvening: string
  noClassesToday: string; classesToday: string; classTodaySingle: string
  statToday: string; statWeek: string; statGroups: string
  tabToday: string; tabWeek: string; tabHistory: string
  noClasses: string; noClassesHint: string
  noClassesDay: string
  today: string; classes: string; classSingle: string
  noHistory: string; noHistoryHint: string
  noRecords: string; noSession: string
  statusPresent: string; statusAbsent: string; statusLate: string
}> = {
  fr: {
    greetMorning: 'Bonjour', greetAfternoon: 'Bon après-midi', greetEvening: 'Bonsoir',
    noClassesToday: "Aucun cours aujourd'hui.",
    classesToday: 'cours aujourd\'hui.', classTodaySingle: 'cours aujourd\'hui.',
    statToday: "Aujourd'hui", statWeek: 'Cette semaine', statGroups: 'Groupes',
    tabToday: "Aujourd'hui", tabWeek: 'Semaine', tabHistory: 'Historique',
    noClasses: "Aucun cours aujourd'hui",
    noClassesHint: 'Passez à Semaine pour voir votre emploi du temps',
    noClassesDay: 'Aucun cours',
    today: "Aujourd'hui", classes: ' cours', classSingle: ' cours',
    noHistory: 'Aucune séance enregistrée',
    noHistoryHint: 'Les séances passées apparaîtront ici',
    noRecords: 'Aucun relevé', noSession: 'Aucun enregistrement pour cette séance',
    statusPresent: 'Présent', statusAbsent: 'Absent', statusLate: 'Retard',
  },
  en: {
    greetMorning: 'Good morning', greetAfternoon: 'Good afternoon', greetEvening: 'Good evening',
    noClassesToday: 'No classes scheduled for today.',
    classesToday: 'classes today.', classTodaySingle: 'class today.',
    statToday: 'Today', statWeek: 'This week', statGroups: 'Groups',
    tabToday: 'Today', tabWeek: 'Full Week', tabHistory: 'History',
    noClasses: 'No classes today',
    noClassesHint: 'Switch to Full Week to see your schedule',
    noClassesDay: 'No classes',
    today: 'Today', classes: ' classes', classSingle: ' class',
    noHistory: 'No sessions recorded yet',
    noHistoryHint: 'Past attendance sessions will appear here',
    noRecords: 'No records', noSession: 'No attendance records for this session',
    statusPresent: 'Present', statusAbsent: 'Absent', statusLate: 'Late',
  },
  ar: {
    greetMorning: 'صباح الخير', greetAfternoon: 'مساء الخير', greetEvening: 'مساء النور',
    noClassesToday: 'لا توجد حصص اليوم.',
    classesToday: 'حصص اليوم.', classTodaySingle: 'حصة اليوم.',
    statToday: 'اليوم', statWeek: 'هذا الأسبوع', statGroups: 'الفصول',
    tabToday: 'اليوم', tabWeek: 'الأسبوع', tabHistory: 'السجل',
    noClasses: 'لا توجد حصص اليوم',
    noClassesHint: 'انتقل إلى الأسبوع لرؤية جدولك',
    noClassesDay: 'لا توجد حصص',
    today: 'اليوم', classes: ' حصص', classSingle: ' حصة',
    noHistory: 'لم تُسجَّل أي حصص بعد',
    noHistoryHint: 'ستظهر هنا الحصص السابقة',
    noRecords: 'لا توجد سجلات', noSession: 'لا توجد سجلات حضور لهذه الحصة',
    statusPresent: 'حاضر', statusAbsent: 'غائب', statusLate: 'متأخر',
  },
}

const DAY_LABELS: Record<Day, Record<Lang, string>> = {
  Monday:    { fr: 'Lundi',    en: 'Monday',    ar: 'الاثنين'  },
  Tuesday:   { fr: 'Mardi',    en: 'Tuesday',   ar: 'الثلاثاء' },
  Wednesday: { fr: 'Mercredi', en: 'Wednesday', ar: 'الأربعاء' },
  Thursday:  { fr: 'Jeudi',    en: 'Thursday',  ar: 'الخميس'   },
  Friday:    { fr: 'Vendredi', en: 'Friday',     ar: 'الجمعة'   },
  Saturday:  { fr: 'Samedi',   en: 'Saturday',  ar: 'السبت'    },
}

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getTodayName(): Day {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return names[new Date().getDay()] as Day
}

interface SessionHistory {
  id: string; session_date: string
  groupName: string; courseName: string
  startTime: string; endTime: string
  total: number; present: number; absent: number; late: number
}

type Tab = 'today' | 'week' | 'history'

const STATUS_DOT: Record<string, string> = {
  present: 'bg-green-400', absent: 'bg-red-400', late: 'bg-yellow-400',
}

export default function TeacherPage() {
  const { profile }   = useAuthStore()
  const { language }  = useSettingsStore()
  const lang   = (language || 'fr') as Lang
  const ui     = UI[lang]
  const isRtl  = lang === 'ar'
  const dateLocale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR'

  const {
    todaySlots, allSlots,
    scheduleLoading, sessionLoading,
    activeSession, fetchSchedule, startSession,
  } = useAttendanceStore()

  const [tab,      setTab]      = useState<Tab>('today')
  const [history,  setHistory]  = useState<SessionHistory[]>([])
  const [histLoad, setHistLoad] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details,  setDetails]  = useState<Record<string, any[]>>({})

  const todayName = getTodayName()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? ui.greetMorning : hour < 18 ? ui.greetAfternoon : ui.greetEvening

  const dateStr = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  const fetchHistory = useCallback(async () => {
    setHistLoad(true)
    const supabase = createClient()
    const uid = profile?.id
    if (!uid) { setHistLoad(false); return }

    const { data: sessions } = await supabase
      .from('class_sessions')
      .select(`id, session_date,
        teacher_planning!inner ( teacher_id, start_time, end_time,
          groups ( name ), courses ( name ) ),
        attendance ( status )`)
      .eq('teacher_planning.teacher_id', uid)
      .order('session_date', { ascending: false })
      .limit(50)

    if (!sessions) { setHistLoad(false); return }

    setHistory(sessions.map((s: any) => {
      const tp      = s.teacher_planning
      const records = s.attendance ?? []
      return {
        id: s.id, session_date: s.session_date,
        groupName:  tp?.groups?.name  ?? '—',
        courseName: tp?.courses?.name ?? '—',
        startTime:  tp?.start_time?.slice(0,5) ?? '',
        endTime:    tp?.end_time?.slice(0,5)   ?? '',
        total:   records.length,
        present: records.filter((r: any) => r.status === 'present').length,
        absent:  records.filter((r: any) => r.status === 'absent').length,
        late:    records.filter((r: any) => r.status === 'late').length,
      }
    }))
    setHistLoad(false)
  }, [profile?.id])

  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab, fetchHistory])

  const toggleExpand = async (sessionId: string) => {
    if (expanded === sessionId) { setExpanded(null); return }
    setExpanded(sessionId)
    if (details[sessionId]) return
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance')
      .select('status, reason, students ( name, massar_code )')
      .eq('session_id', sessionId)
      .order('students(name)')
    setDetails(prev => ({ ...prev, [sessionId]: data ?? [] }))
  }

  const byDay = DAYS.reduce<Record<Day, TeacherPlanningFull[]>>(
    (acc, day) => { acc[day] = allSlots.filter(s => s.day === day); return acc },
    {} as Record<Day, TeacherPlanningFull[]>
  )

  const statusLabel = (s: string) =>
    s === 'present' ? ui.statusPresent : s === 'absent' ? ui.statusAbsent : ui.statusLate

  return (
    <div className={`max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* ── Greeting ─────────────────────────────────── */}
      <div className={`bg-gradient-to-br from-blue-600/20 to-blue-500/5 border border-blue-500/20
        rounded-2xl px-4 sm:px-6 py-4 sm:py-5 ${isRtl ? 'text-right' : ''}`}>
        <p className="text-slate-400 text-xs sm:text-sm capitalize">{dateStr}</p>
        <h1 className="text-lg sm:text-xl font-bold text-white mt-1">
          {greeting}, {profile?.name?.split(' ')[0] ?? '...'}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          {todaySlots.length === 0
            ? ui.noClassesToday
            : `${todaySlots.length} ${todaySlots.length !== 1 ? ui.classesToday : ui.classTodaySingle}`
          }
        </p>
      </div>

      {/* ── Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { value: todaySlots.length, label: ui.statToday },
          { value: allSlots.length,   label: ui.statWeek  },
          { value: new Set(allSlots.map(s => s.group_id)).size, label: ui.statGroups },
        ].map(({ value, label }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl px-3 sm:px-4 py-3 text-center">
            <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className={`flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit
        ${isRtl ? 'flex-row-reverse' : ''}`}>
        {([
          { key: 'today'  as Tab, label: ui.tabToday,   badge: todaySlots.length > 0 ? todaySlots.length : null },
          { key: 'week'   as Tab, label: ui.tabWeek,    badge: null },
          { key: 'history'as Tab, label: ui.tabHistory, badge: null },
        ]).map(({ key, label, badge }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap
              ${tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-blue-300 hover:text-white'}`}>
            {label}
            {badge !== null && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                ${tab === key ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────── */}
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
            <p className="text-slate-400 font-medium">{ui.noClasses}</p>
            <p className="text-slate-600 text-sm mt-1">{ui.noClassesHint}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaySlots.map(slot => (
              <ScheduleCard key={slot.id} slot={slot} isToday onStart={startSession} loading={sessionLoading} />
            ))}
          </div>
        )

      ) : tab === 'week' ? (
        <div className="space-y-3 sm:space-y-4">
          {DAYS.map(day => {
            const slots   = byDay[day]
            const isToday = day === todayName
            return (
              <div key={day} className={`bg-slate-900 border rounded-2xl overflow-hidden
                ${isToday ? 'border-blue-500/30' : 'border-slate-800'}`}>
                <div className={`px-4 sm:px-5 py-3 border-b flex items-center gap-2
                  ${isRtl ? 'flex-row-reverse' : ''}
                  ${isToday ? 'border-blue-500/20 bg-blue-500/5' : 'border-slate-800'}`}>
                  <h3 className={`text-sm font-semibold ${isToday ? 'text-blue-400' : 'text-slate-300'}`}>
                    {DAY_LABELS[day][lang]}
                  </h3>
                  {isToday && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">
                      {ui.today}
                    </span>
                  )}
                  <span className={`text-xs text-slate-600 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                    {slots.length}{slots.length !== 1 ? ui.classes : ui.classSingle}
                  </span>
                </div>
                {slots.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-slate-600">{ui.noClassesDay}</div>
                ) : (
                  <div className="p-3 space-y-2">
                    {slots.map(slot => (
                      <ScheduleCard key={slot.id} slot={slot} isToday={isToday} onStart={startSession} loading={sessionLoading} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      ) : (
        /* ── History tab ─────────────────────────────── */
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
            <p className="text-slate-400 font-medium">{ui.noHistory}</p>
            <p className="text-slate-600 text-sm mt-1">{ui.noHistoryHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(s => {
              const rate      = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
              const rateColor = rate >= 85 ? 'text-green-400' : rate >= 70 ? 'text-yellow-400' : 'text-red-400'
              const isOpen    = expanded === s.id
              const studs     = details[s.id] ?? []

              return (
                <div key={s.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition">
                  <button onClick={() => toggleExpand(s.id)}
                    className={`w-full text-left px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4
                      ${isRtl ? 'flex-row-reverse' : ''}`}>

                    {/* Date */}
                    <div className="shrink-0 w-12 sm:w-14 text-center">
                      <p className="text-base sm:text-lg font-bold text-white leading-none">
                        {new Date(s.session_date).getDate()}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(s.session_date).toLocaleDateString(dateLocale, { month: 'short' })}
                      </p>
                      <p className="text-xs text-slate-600">
                        {new Date(s.session_date).getFullYear()}
                      </p>
                    </div>

                    <div className="w-px h-10 bg-slate-800 shrink-0" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <p className="text-sm font-semibold text-white">{s.courseName}</p>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">{s.groupName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{s.startTime} – {s.endTime}</p>
                    </div>

                    {/* Stats + chevron */}
                    <div className={`shrink-0 flex items-center gap-1.5 sm:gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                        <span className="text-xs text-slate-600 italic">{ui.noRecords}</span>
                      )}
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ml-1 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-slate-800 px-4 sm:px-5 py-3">
                      {studs.length === 0 ? (
                        <p className="text-xs text-slate-600 italic py-2">{ui.noSession}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {studs.map((a: any, i: number) => (
                            <div key={i} className={`flex items-center gap-2 sm:gap-3 py-1
                              ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? 'bg-slate-600'}`} />
                              <span className="text-xs sm:text-sm text-white flex-1">{a.students?.name ?? '—'}</span>
                              <span className="text-xs font-mono text-slate-500 hidden sm:inline">{a.students?.massar_code ?? ''}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                a.status === 'present' ? 'bg-green-500/10 text-green-400' :
                                a.status === 'absent'  ? 'bg-red-500/10  text-red-400'   :
                                                         'bg-yellow-500/10 text-yellow-400'
                              }`}>
                                {statusLabel(a.status)}
                              </span>
                              {a.reason && (
                                <span className="text-xs text-slate-500 italic max-w-[100px] truncate hidden sm:inline">
                                  {a.reason}
                                </span>
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
