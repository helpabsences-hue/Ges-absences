'use client'
// src/components/teacher/AttendanceModal.tsx

import { useAttendanceStore } from '@/stores/useAttendanceStore'
import type { AttendanceStatus } from '@/types'

// ── Status button config ───────────────────────────────────
const STATUSES: { value: AttendanceStatus; label: string; active: string; icon: string }[] = [
  {
    value:  'present',
    label:  'Present',
    active: 'bg-green-500 text-white border-green-500',
    icon:   '✓',
  },
  {
    value:  'absent',
    label:  'Absent',
    active: 'bg-red-500 text-white border-red-500',
    icon:   '✗',
  },
  {
    value:  'late',
    label:  'Late',
    active: 'bg-yellow-500 text-white border-yellow-500',
    icon:   '⏱',
  },
]

const STATUS_DOT: Record<AttendanceStatus, string> = {
  present:  'bg-green-500',
  absent:   'bg-red-500',
  late:     'bg-yellow-500',
  unmarked: 'bg-slate-600',
}

function fmt(t: string) { return t.slice(0, 5) }

// ── Component ──────────────────────────────────────────────
export default function AttendanceModal() {
  const {
    activeSession,
    activePlanning,
    students,
    records,
    saving,
    saved,
    sessionLoading,
    setStatus,
    setReason,
    setAllPresent,
    setAllAbsent,
    saveAttendance,
    closeSession,
  } = useAttendanceStore()

  if (!activePlanning) return null

  // ── Summary counts ─────────────────────────────────────
  const counts = students.reduce(
    (acc, s) => {
      const status = records[s.id]?.status ?? 'unmarked'
      acc[status] = (acc[status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const present  = counts.present  ?? 0
  const absent   = counts.absent   ?? 0
  const late     = counts.late     ?? 0
  const total    = students.length

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={closeSession}
      />

      {/* ── Modal panel ───────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

          {/* ── Header ────────────────────────────────── */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-800 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {activePlanning.courses.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-md">
                    {activePlanning.groups.name} — Y{activePlanning.groups.year}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {fmt(activePlanning.start_time)} – {fmt(activePlanning.end_time)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date().toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long',
                    })}
                  </span>
                </div>
              </div>
              <button
                onClick={closeSession}
                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary bar */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-green-400 font-semibold">{present}</span>
                <span className="text-slate-500">present</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span className="text-red-400 font-semibold">{absent}</span>
                <span className="text-slate-500">absent</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                <span className="text-yellow-400 font-semibold">{late}</span>
                <span className="text-slate-500">late</span>
              </div>
              <div className="ml-auto text-xs text-slate-500">
                {total} student{total !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden flex">
              {present > 0 && (
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(present / total) * 100}%` }}
                />
              )}
              {late > 0 && (
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(late / total) * 100}%` }}
                />
              )}
              {absent > 0 && (
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${(absent / total) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* ── Bulk actions ──────────────────────────── */}
          <div className="px-6 py-3 border-b border-slate-800 shrink-0 flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-1">Mark all:</span>
            <button
              onClick={setAllPresent}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition"
            >
              All Present
            </button>
            <button
              onClick={setAllAbsent}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition"
            >
              All Absent
            </button>
          </div>

          {/* ── Student list ──────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {sessionLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : students.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 font-medium">No students in this group</p>
                <p className="text-slate-600 text-sm mt-1">
                  Add students from the Students page first
                </p>
              </div>
            ) : (
              students.map((student, idx) => {
                const record  = records[student.id]
                const status  = record?.status ?? 'unmarked'
                const reason  = record?.reason ?? ''
                const isAbsent = status === 'absent'
                const isLate   = status === 'late'

                return (
                  <div
                    key={student.id}
                    className={`
                      rounded-xl border p-3.5 transition-all
                      ${status === 'present' ? 'border-green-500/20 bg-green-500/5' :
                        status === 'absent'  ? 'border-red-500/20   bg-red-500/5' :
                        status === 'late'    ? 'border-yellow-500/20 bg-yellow-500/5' :
                        'border-slate-800 bg-slate-800/30'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* Index + dot */}
                      <div className="w-7 text-right shrink-0">
                        <span className="text-xs text-slate-600">{idx + 1}</span>
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-300">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Name + massar */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {student.massar_code}
                        </p>
                      </div>

                      {/* Status buttons */}
                      <div className="flex gap-1.5 shrink-0">
                        {STATUSES.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setStatus(student.id, s.value)}
                            title={s.label}
                            className={`
                              w-8 h-8 rounded-lg text-sm font-bold border transition-all
                              ${status === s.value
                                ? s.active
                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500 hover:text-slate-300'
                              }
                            `}
                          >
                            {s.icon}
                          </button>
                        ))}
                      </div>

                      {/* Status dot indicator */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status as AttendanceStatus]}`} />
                    </div>

                    {/* Reason input — shown for absent / late */}
                    {(isAbsent || isLate) && (
                      <div className="mt-2.5 ml-10 pl-8">
                        <input
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(student.id, e.target.value)}
                          placeholder={isAbsent ? 'Reason for absence (optional)' : 'Reason for being late (optional)'}
                          className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* ── Footer ────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-slate-800 shrink-0 flex items-center justify-between gap-3">
            <button
              onClick={closeSession}
              className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition"
            >
              Close
            </button>

            <div className="flex items-center gap-3">
              {/* Saved confirmation */}
              {saved && (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}

              <button
                onClick={saveAttendance}
                disabled={saving || students.length === 0}
                className="
                  flex items-center gap-2
                  bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                  text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all
                "
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}