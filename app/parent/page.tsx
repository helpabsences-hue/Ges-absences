'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogoIcon } from '@/components/shared/LogoIcon'

interface ChildStats {
    name: string
    massar_code: string
    group_name: string
    school_name: string
    total: number
    present: number
    absent: number
    late: number
}

interface AbsenceRecord {
    date: string
    course: string
    start: string
    end: string
    status: string
}

export default function ParentDashboard() {
    const [stats, setStats] = useState<ChildStats | null>(null)
    const [absences, setAbsences] = useState<AbsenceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        const load = async () => {
            const supabase = createClient()

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/auth/login'); return }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, student_id, name')
                .eq('id', user.id)
                .single()

            if (!profile || profile.role !== 'parent') {
                router.push('/dashboard')
                return
            }

            if (!profile.student_id) {
                setError('Aucun étudiant associé à ce compte parent.')
                setLoading(false)
                return
            }

            const { data: student } = await supabase
                .from('students')
                .select('name, massar_code, groups(name), schools(name)')
                .eq('id', profile.student_id)
                .single()

            // ── Fixed query with !inner joins ──
            const { data: attendance } = await supabase
                .from('attendance')
                .select(`
                    status,
                    class_sessions!inner(
                        session_date,
                        teacher_planning!inner(
                            start_time,
                            end_time,
                            courses!inner(name)
                        )
                    )
                `)
                .eq('student_id', profile.student_id)
                .order('created_at', { ascending: false })

            const records = (attendance ?? []) as any[]

            const total   = records.length
            const present = records.filter(r => r.status === 'present').length
            const absent  = records.filter(r => r.status === 'absent').length
            const late    = records.filter(r => r.status === 'late').length

            setStats({
                name:        student?.name ?? '',
                massar_code: student?.massar_code ?? '',
                group_name:  (student as any)?.groups?.name ?? '',
                school_name: (student as any)?.schools?.name ?? '',
                total, present, absent, late,
            })

            // ── Filter only valid dates before mapping ──
            const absenceRows = records
                .filter(r => (r.status === 'absent' || r.status === 'late') && r.class_sessions?.session_date)
                .map(r => ({
                    date:   r.class_sessions.session_date,
                    course: r.class_sessions?.teacher_planning?.courses?.name ?? '—',
                    start:  r.class_sessions?.teacher_planning?.start_time?.slice(0, 5) ?? '',
                    end:    r.class_sessions?.teacher_planning?.end_time?.slice(0, 5) ?? '',
                    status: r.status,
                }))
                .sort((a, b) => b.date.localeCompare(a.date))

            setAbsences(absenceRows)
            setLoading(false)
        }
        load()
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/auth/login')
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center space-y-4">
                <p className="text-red-400">{error}</p>
                <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm">
                    Se déconnecter
                </button>
            </div>
        </div>
    )

    const rate = stats && stats.total > 0
        ? Math.round(stats.present / stats.total * 100)
        : 0

    return (
        <div className="min-h-screen bg-slate-950 text-white">

            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LogoIcon />
                        <div>
                            <span className="font-bold text-white text-sm sm:text-base">
                                Attend<span className="text-blue-400">efy</span>
                            </span>
                            <span className="text-slate-500 text-xs sm:text-sm font-normal ml-2">— {stats?.school_name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-white leading-tight">{stats?.name}</p>
                            <span className="text-xs text-blue-400 font-medium">Parent</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-blue-400">
                                {stats?.name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <button onClick={handleLogout}
                            className="ml-1 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Déconnecter">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

                {/* Child info card */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5">
                    <p className="text-blue-200 text-xs font-medium mb-1">Votre enfant</p>
                    <h2 className="text-xl font-bold text-white">{stats?.name}</h2>
                    <div className="flex flex-wrap gap-3 mt-3">
                        <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-lg">{stats?.group_name}</span>
                        <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-lg">{stats?.massar_code}</span>
                        <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-lg">{stats?.school_name}</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Taux de présence', value: rate + '%',      color: rate >= 80 ? 'text-green-400' : rate >= 60 ? 'text-amber-400' : 'text-red-400', bg: 'bg-slate-900' },
                        { label: 'Total séances',    value: stats?.total,    color: 'text-white',      bg: 'bg-slate-900'      },
                        { label: 'Absences',         value: stats?.absent,   color: 'text-red-400',    bg: 'bg-red-500/10'    },
                        { label: 'Retards',          value: stats?.late,     color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-4`}>
                            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Absence history */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-800">
                        <h3 className="font-semibold text-white text-sm">Historique des absences et retards</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {absences.length} enregistrement{absences.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {absences.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-4xl mb-2">✅</p>
                            <p className="text-slate-400 text-sm">Aucune absence enregistrée</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {absences.map((a, i) => (
                                <div key={i} className="px-5 py-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white">{a.course}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {new Date(a.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                                                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                            })} · {a.start}–{a.end}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                                        a.status === 'absent'
                                            ? 'bg-red-500/15 text-red-400'
                                            : 'bg-amber-500/15 text-amber-400'
                                    }`}>
                                        {a.status === 'absent' ? 'Absent' : 'Retard'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-slate-600 pb-4">
                    Attendefy · {stats?.school_name}
                </p>
            </div>
        </div>
    )
}