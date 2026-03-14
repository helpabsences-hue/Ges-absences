'use client'
// src/components/teacher/ScheduleCard.tsx

import type { TeacherPlanningFull } from '@/types'

interface Props {
  slot:      TeacherPlanningFull
  isToday:   boolean           // true when rendered in "Today" tab
  onStart:   (slot: TeacherPlanningFull) => void
  loading:   boolean
}

const DAY_COLORS: Record<string, string> = {
  Monday:    'bg-blue-500/10   text-blue-400   border-blue-500/20',
  Tuesday:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Wednesday: 'bg-green-500/10  text-green-400  border-green-500/20',
  Thursday:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Friday:    'bg-pink-500/10   text-pink-400   border-pink-500/20',
  Saturday:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

function fmt(t: string) {
  return t.slice(0, 5)
}

export default function ScheduleCard({ slot, isToday, onStart, loading }: Props) {
  return (
    <div className={`
      bg-slate-900 border rounded-2xl p-5 flex items-center justify-between gap-4
      transition-all hover:border-slate-700
      ${isToday ? 'border-slate-700' : 'border-slate-800'}
    `}>
      {/* Left: course icon + info */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        {/* Details */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {slot.courses.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Group badge */}
            <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-md">
              {slot.groups.name}
              <span className="text-slate-500 ml-1">Y{slot.groups.year}</span>
            </span>
            {/* Time */}
            <span className="text-xs text-slate-500 font-mono">
              {fmt(slot.start_time)} – {fmt(slot.end_time)}
            </span>
            {/* Day badge (only in full schedule view) */}
            {!isToday && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${DAY_COLORS[slot.day] ?? ''}`}>
                {slot.day}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Start Session button (only on Today tab) */}
      {isToday && (
        <button
          onClick={() => onStart(slot)}
          disabled={loading}
          className="
            shrink-0 flex items-center gap-2
            bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
            text-white text-sm font-medium px-4 py-2.5 rounded-xl
            transition-all
          "
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          Start Session
        </button>
      )}
    </div>
  )
}