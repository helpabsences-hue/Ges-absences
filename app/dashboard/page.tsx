'use client'
// src/app/dashboard/page.tsx

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import Link from 'next/link'

interface DashboardStats {
  teachers:  number
  students:  number
  groups:    number
  courses:   number
  sessions:  number   // total sessions ever
  today:     number   // sessions recorded today
}

interface RecentSession {
  id:           string
  session_date: string
  group_name:   string
  course_name:  string
  teacher_name: string
  present:      number
  total:        number
}

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const [stats,    setStats]    = useState<DashboardStats | null>(null)
  const [recent,   setRecent]   = useState<RecentSession[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      // Run all count queries in parallel
      const [
        { count: teachers  },
        { count: students  },
        { count: groups    },
        { count: courses   },
        { count: sessions  },
        { count: todaySess },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('groups').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('class_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('class_sessions').select('*', { count: 'exact', head: true }).eq('session_date', today),
      ])

      setStats({
        teachers:  teachers  ?? 0,
        students:  students  ?? 0,
        groups:    groups    ?? 0,
        courses:   courses   ?? 0,
        sessions:  sessions  ?? 0,
        today:     todaySess ?? 0,
      })

      // Recent sessions with attendance counts
      const { data: recentData } = await supabase
        .from('class_sessions')
        .select(`
          id,
          session_date,
          teacher_planning (
            profiles ( name ),
            groups   ( name ),
            courses  ( name )
          ),
          attendance ( status )
        `)
        .order('session_date', { ascending: false })
        .limit(8)

      const rows: RecentSession[] = (recentData ?? []).map((s: any) => {
        const att   = s.attendance ?? []
        const total   = att.length
        const present = att.filter((a: any) => a.status === 'present' || a.status === 'late').length
        return {
          id:           s.id,
          session_date: s.session_date,
          group_name:   s.teacher_planning?.groups?.name  ?? '—',
          course_name:  s.teacher_planning?.courses?.name ?? '—',
          teacher_name: s.teacher_planning?.profiles?.name ?? '—',
          present,
          total,
        }
      })

      setRecent(rows)
      setLoading(false)
    }

    load()

    // ── Realtime subscription ─────────────────────────────
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-realtime-' + Date.now())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (_payload: any) => {
          console.log('realtime: attendance changed', _payload)
          load()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_sessions' },
        (_payload: any) => {
          console.log('realtime: class_sessions changed', _payload)
          load()
        }
      )
      .subscribe((status: string) => {
        console.log('realtime subscription status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // ── Stat card items ────────────────────────────────────
  const statCards = stats ? [
    { label: 'Teachers',  value: stats.teachers, href: '/dashboard/teachers', icon: '👩‍🏫', color: 'text-green-400' },
    { label: 'Students',  value: stats.students, href: '/dashboard/students', icon: '🎓', color: 'text-blue-400'  },
    { label: 'Groups',    value: stats.groups,   href: '/dashboard/groups',   icon: '📚', color: 'text-purple-400'},
    { label: 'Courses',   value: stats.courses,  href: '/dashboard/courses',  icon: '📖', color: 'text-orange-400'},
    { label: 'Sessions today', value: stats.today,    href: '/dashboard/reports',  icon: '📋', color: 'text-pink-400'  },
    { label: 'Total sessions', value: stats.sessions, href: '/dashboard/reports',  icon: '📊', color: 'text-teal-400'  },
  ] : []

  // ── Quick links ───────────────────────────────────────
  const quickLinks = [
    { label: 'Add Student',    href: '/dashboard/students',   icon: '➕' },
    { label: 'Add Teacher',    href: '/dashboard/invitations', icon: '✉️' },
    { label: 'Plan Schedule',  href: '/dashboard/planning',    icon: '📅' },
    { label: 'View Reports',   href: '/dashboard/reports',     icon: '📊' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Greeting ────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600/20 to-slate-900 border border-blue-500/20 rounded-2xl px-6 py-5">
        <p className="text-slate-400 text-sm">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-xl font-bold text-white mt-1">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {profile?.schools?.name} · {profile?.role === 'super_admin' ? 'Directeur' : 'Admin'}
        </p>
      </div>

      {/* ── Stats grid ──────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-5 animate-pulse">
              <div className="h-7 w-14 bg-slate-800 rounded mb-2" />
              <div className="h-3 w-20 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {statCards.map(({ label, value, href, icon, color }) => (
            <Link
              key={label}
              href={href}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl px-5 py-5 transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{icon}</span>
                <svg className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* ── Quick links ─────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map(({ label, href, icon }) => (
            <Link
              key={label}
              href={href}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 rounded-xl px-4 py-3.5 flex items-center gap-3 transition-all group"
            >
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent sessions ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400">Recent Sessions</h3>
          <Link href="/dashboard/reports" className="text-xs text-blue-400 hover:text-blue-300 transition">
            View all →
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">No sessions recorded yet</p>
              <p className="text-slate-600 text-xs mt-1">Sessions appear here once teachers start marking attendance</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Session</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Teacher</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recent.map((s) => {
                  const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : null
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-white">{s.course_name}</p>
                        <p className="text-xs text-slate-500">{s.group_name}</p>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-sm text-slate-400">{s.teacher_name}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-400">
                          {new Date(s.session_date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {s.total > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${rateColor(rate ?? 0)}`}>
                              {s.present}/{s.total}
                            </span>
                            {rate !== null && (
                              <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${rateBg(rate)}`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">No records</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function rateColor(rate: number) {
  if (rate >= 85) return 'text-green-400'
  if (rate >= 70) return 'text-yellow-400'
  return 'text-red-400'
}

function rateBg(rate: number) {
  if (rate >= 85) return 'bg-green-500'
  if (rate >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}