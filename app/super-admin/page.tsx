// 'use client'
// export const dynamic = 'force-dynamic'

// import { useEffect, useState, useCallback } from 'react'
// import { createClient } from '@/lib/supabase/client'
// import { useRouter } from 'next/navigation'
// import { LogoIcon } from '@/components/shared/LogoIcon'

// interface School {
//   id: string
//   name: string
//   city: string
//   country: string
//   status: string
//   trial_ends_at: string | null
//   paid_until: string | null
//   created_at: string
//   studentCount: number
//   teacherCount: number
//   adminName: string
//   adminEmail: string
// }

// function StatusBadge({ status, trialEndsAt }: { status: string; trialEndsAt: string | null }) {
//   const now = new Date()
//   const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null
//   const isExpired = status === 'trial' && trialEnd && trialEnd < now

//   if (isExpired) return (
//     <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400">
//       <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Essai expiré
//     </span>
//   )
//   if (status === 'trial') return (
//     <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400">
//       <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Essai
//     </span>
//   )
//   if (status === 'active') return (
//     <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400">
//       <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Actif
//     </span>
//   )
//   return (
//     <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-500/15 text-slate-400">
//       <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Inactif
//     </span>
//   )
// }

// export default function SuperAdminDashboard() {
//   const [schools, setSchools] = useState<School[]>([])
//   const [loading, setLoading] = useState(true)
//   const [updating, setUpdating] = useState<string | null>(null)
//   const [search, setSearch] = useState('')
//   const router = useRouter()

//   const loadSchools = useCallback(async () => {
//     const supabase = createClient()
//     const { data: { user } } = await supabase.auth.getUser()
//     if (!user) { router.push('/auth/login'); return }

//     const { data: profile } = await supabase
//       .from('profiles').select('role').eq('id', user.id).single()

//     // Only platform_admin can access this page
//     if (profile?.role !== 'platform_admin') {
//       router.push('/dashboard')
//       return
//     }

//     const { data: schoolsData } = await supabase
//       .from('schools')
//       .select('id, name, city, country, status, trial_ends_at, paid_until, created_at')
//       .order('created_at', { ascending: false })

//     if (!schoolsData) { setLoading(false); return }

//     const enriched = await Promise.all(schoolsData.map(async (s) => {
//       const [
//         { count: studentCount },
//         { count: teacherCount },
//         { data: admin },
//       ] = await Promise.all([
//         supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', s.id),
//         supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', s.id).eq('role', 'teacher'),
//         supabase.from('profiles').select('name, email').eq('school_id', s.id).in('role', ['super_admin', 'admin']).limit(1).maybeSingle(),
//       ])
//       return {
//         ...s,
//         status: s.status ?? 'trial',
//         studentCount: studentCount ?? 0,
//         teacherCount: teacherCount ?? 0,
//         adminName: admin?.name ?? '—',
//         adminEmail: admin?.email ?? '—',
//       }
//     }))

//     setSchools(enriched)
//     setLoading(false)
//   }, [router])

//   useEffect(() => { loadSchools() }, [loadSchools])

//   const updateStatus = async (schoolId: string, status: string, paidMonths?: number) => {
//     setUpdating(schoolId)
//     const supabase = createClient()
//     const updates: any = { status }

//     if (status === 'active' && paidMonths) {
//       const d = new Date()
//       d.setMonth(d.getMonth() + paidMonths)
//       updates.paid_until = d.toISOString()
//     }
//     if (status === 'trial') {
//       const d = new Date()
//       d.setDate(d.getDate() + 30)
//       updates.trial_ends_at = d.toISOString()
//       updates.paid_until = null
//     }

//     await supabase.from('schools').update(updates).eq('id', schoolId)
//     await loadSchools()
//     setUpdating(null)
//   }

//   const handleLogout = async () => {
//     await createClient().auth.signOut()
//     router.push('/auth/login')
//   }

//   const filtered = schools.filter(s =>
//     s.name.toLowerCase().includes(search.toLowerCase()) ||
//     s.city?.toLowerCase().includes(search.toLowerCase()) ||
//     s.adminEmail?.toLowerCase().includes(search.toLowerCase())
//   )

//   const stats = {
//     total: schools.length,
//     active: schools.filter(s => s.status === 'active').length,
//     trial: schools.filter(s => s.status === 'trial' && new Date(s.trial_ends_at ?? '') >= new Date()).length,
//     expired: schools.filter(s => {
//       const trialEnd = s.trial_ends_at ? new Date(s.trial_ends_at) : null
//       return s.status === 'trial' && trialEnd && trialEnd < new Date()
//     }).length,
//   }

//   if (loading) return (
//     <div className="min-h-screen bg-slate-950 flex items-center justify-center">
//       <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
//     </div>
//   )

//   return (
//     <div className="min-h-screen bg-slate-950 text-white">

//       {/* Header */}
//       <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
//         <div className="max-w-7xl mx-auto flex items-center justify-between">
//           <div className="flex items-center gap-3">
//  <LogoIcon className="w-8 h-8 shrink-0" />
//               <span className="text-lg font-bold tracking-tight text-white">
//                 Attend<span className="text-blue-400">ify</span>
//               </span>            
//               <div>
//               <span className="ml-2 text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
//                 Platform Admin
//               </span>
//             </div>
//           </div>
//           <button onClick={handleLogout}
//             className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800">
//             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                 d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//             </svg>
//             Déconnecter
//           </button>
//         </div>
//       </div>

//       <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

//         <div>
//           <h1 className="text-2xl font-bold text-white">Gestion des établissements</h1>
//           <p className="text-slate-400 text-sm mt-1">Tous les établissements inscrits sur Attendefy</p>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           {[
//             { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-slate-900' },
//             { label: 'Actifs', value: stats.active, color: 'text-green-400', bg: 'bg-green-500/10' },
//             { label: 'En essai', value: stats.trial, color: 'text-amber-400', bg: 'bg-amber-500/10' },
//             { label: 'Essai expiré', value: stats.expired, color: 'text-red-400', bg: 'bg-red-500/10' },
//           ].map(s => (
//             <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-5 text-center`}>
//               <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
//               <p className="text-xs text-slate-500 mt-1">{s.label}</p>
//             </div>
//           ))}
//         </div>

//         {/* Search */}
//         <div className="relative">
//           <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//           </svg>
//           <input value={search} onChange={e => setSearch(e.target.value)}
//             placeholder="Rechercher par nom, ville ou email..."
//             className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
//         </div>

//         {/* Schools */}
//         <div className="space-y-3">
//           {filtered.length === 0 ? (
//             <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
//               <p className="text-slate-400">Aucun établissement trouvé</p>
//             </div>
//           ) : filtered.map(school => {
//             const trialEnd = school.trial_ends_at ? new Date(school.trial_ends_at) : null
//             const paidUntil = school.paid_until ? new Date(school.paid_until) : null
//             const isExpired = school.status === 'trial' && trialEnd && trialEnd < new Date()
//             const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : null

//             return (
//               <div key={school.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
//                 <div className="flex flex-wrap items-start justify-between gap-4">
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center gap-3 flex-wrap">
//                       <h3 className="font-semibold text-white text-base">{school.name}</h3>
//                       <StatusBadge status={school.status} trialEndsAt={school.trial_ends_at} />
//                     </div>
//                     <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
//                       <span>📍 {school.city}, {school.country}</span>
//                       <span>👤 {school.adminName} — {school.adminEmail}</span>
//                       <span>📅 Inscrit le {new Date(school.created_at).toLocaleDateString('fr-FR')}</span>
//                     </div>
//                     <div className="flex flex-wrap gap-4 mt-3">
//                       <div className="flex items-center gap-1.5">
//                         <span className="text-lg font-bold text-white">{school.studentCount}</span>
//                         <span className="text-xs text-slate-500">étudiants</span>
//                       </div>
//                       <div className="flex items-center gap-1.5">
//                         <span className="text-lg font-bold text-white">{school.teacherCount}</span>
//                         <span className="text-xs text-slate-500">enseignants</span>
//                       </div>
//                       {school.status === 'trial' && !isExpired && daysLeft !== null && (
//                         <div className="flex items-center gap-1.5">
//                           <span className="text-lg font-bold text-amber-400">{daysLeft}j</span>
//                           <span className="text-xs text-slate-500">restants</span>
//                         </div>
//                       )}
//                       {school.status === 'active' && paidUntil && (
//                         <span className="text-sm font-medium text-green-400">
//                           Payé jusqu'au {paidUntil.toLocaleDateString('fr-FR')}
//                         </span>
//                       )}
//                     </div>
//                   </div>

//                   {/* Actions */}
//                   <div className="flex flex-wrap gap-2 shrink-0">
//                     {school.status !== 'active' && (
//                       <>
//                         <button onClick={() => updateStatus(school.id, 'active', 1)}
//                           disabled={updating === school.id}
//                           className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition disabled:opacity-50">
//                           {updating === school.id ? '...' : '✅ 1 mois'}
//                         </button>
//                         <button onClick={() => updateStatus(school.id, 'active', 12)}
//                           disabled={updating === school.id}
//                           className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition disabled:opacity-50">
//                           {updating === school.id ? '...' : '✅ 1 an'}
//                         </button>
//                       </>
//                     )}
//                     {school.status === 'active' && (
//                       <button onClick={() => updateStatus(school.id, 'active', 12)}
//                         disabled={updating === school.id}
//                         className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition disabled:opacity-50">
//                         {updating === school.id ? '...' : '🔄 Renouveler 1 an'}
//                       </button>
//                     )}
//                     {isExpired && (
//                       <button onClick={() => updateStatus(school.id, 'trial')}
//                         disabled={updating === school.id}
//                         className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition disabled:opacity-50">
//                         {updating === school.id ? '...' : '🔁 Reset essai 30j'}
//                       </button>
//                     )}
//                     {school.status === 'active' && (
//                       <button onClick={() => updateStatus(school.id, 'inactive')}
//                         disabled={updating === school.id}
//                         className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition disabled:opacity-50">
//                         {updating === school.id ? '...' : '🚫 Désactiver'}
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )
//           })}
//         </div>
//       </div>
//     </div>
//   )
// }


'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogoIcon } from '@/components/shared/LogoIcon'

interface School {
  id: string
  name: string
  city: string
  country: string
  status: string
  trial_ends_at: string | null
  paid_until: string | null
  created_at: string
  studentCount: number
  teacherCount: number
  adminName: string
  adminEmail: string
}

function StatusBadge({ status, trialEndsAt }: { status: string; trialEndsAt: string | null }) {
  const now = new Date()
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null
  const isExpired = status === 'trial' && trialEnd && trialEnd < now

  if (isExpired) return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Essai expiré
    </span>
  )
  if (status === 'trial') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Essai
    </span>
  )
  if (status === 'active') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500/15 text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Actif
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-500/15 text-slate-400">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Inactif
    </span>
  )
}

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const router = useRouter()

  const loadSchools = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    // Only platform_admin can access this page
    if (profile?.role !== 'platform_admin') {
      router.push('/dashboard')
      return
    }

    const { data: schoolsData } = await supabase
      .from('schools')
      .select('id, name, city, country, status, trial_ends_at, paid_until, created_at')
      .order('created_at', { ascending: false })

    if (!schoolsData) { setLoading(false); return }

    const enriched = await Promise.all(schoolsData.map(async (s) => {
      const [
        { count: studentCount },
        { count: teacherCount },
        { data: admin },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', s.id),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', s.id).eq('role', 'teacher'),
        supabase.from('profiles').select('name, email').eq('school_id', s.id).in('role', ['super_admin', 'admin']).limit(1).maybeSingle(),
      ])
      return {
        ...s,
        status: s.status ?? 'trial',
        studentCount: studentCount ?? 0,
        teacherCount: teacherCount ?? 0,
        adminName: admin?.name ?? '—',
        adminEmail: admin?.email ?? '—',
      }
    }))

    setSchools(enriched)
    setLoading(false)
  }, [router])

  useEffect(() => { loadSchools() }, [loadSchools])

  const updateStatus = async (schoolId: string, status: string, paidMonths?: number) => {
    setUpdating(schoolId)
    const supabase = createClient()
    const updates: any = { status }

    if (status === 'active' && paidMonths) {
      // Find current paid_until to add on top of it
      const school = schools.find(s => s.id === schoolId)
      const currentPaidUntil = school?.paid_until ? new Date(school.paid_until) : new Date()
      // If paid_until is in the past, start from today
      const baseDate = currentPaidUntil > new Date() ? currentPaidUntil : new Date()
      baseDate.setMonth(baseDate.getMonth() + paidMonths)
      updates.paid_until = baseDate.toISOString()
    }
    if (status === 'trial') {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      updates.trial_ends_at = d.toISOString()
      updates.paid_until = null
    }

    await supabase.from('schools').update(updates).eq('id', schoolId)
    await loadSchools()
    setUpdating(null)
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase()) ||
    s.adminEmail?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: schools.length,
    active: schools.filter(s => s.status === 'active').length,
    trial: schools.filter(s => s.status === 'trial' && new Date(s.trial_ends_at ?? '') >= new Date()).length,
    expired: schools.filter(s => {
      const trialEnd = s.trial_ends_at ? new Date(s.trial_ends_at) : null
      return s.status === 'trial' && trialEnd && trialEnd < new Date()
    }).length,
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoIcon className="w-8 h-8 shrink-0" />
            <span className="text-lg font-bold tracking-tight text-white">
              Attend<span className="text-blue-400">efy</span>
            </span>            
            <div>
              <span className="ml-2 text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded-full font-medium">
                Platform Admin
              </span>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-red-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnecter
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des établissements</h1>
          <p className="text-slate-400 text-sm mt-1">Tous les établissements inscrits sur Attendefy</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-slate-900' },
            { label: 'Actifs', value: stats.active, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'En essai', value: stats.trial, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Essai expiré', value: stats.expired, color: 'text-red-400', bg: 'bg-red-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-5 text-center`}>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, ville ou email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        {/* Schools */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
              <p className="text-slate-400">Aucun établissement trouvé</p>
            </div>
          ) : filtered.map(school => {
            const trialEnd = school.trial_ends_at ? new Date(school.trial_ends_at) : null
            const paidUntil = school.paid_until ? new Date(school.paid_until) : null
            const isExpired = school.status === 'trial' && trialEnd && trialEnd < new Date()
            const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : null

            return (
              <div key={school.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white text-base">{school.name}</h3>
                      <StatusBadge status={school.status} trialEndsAt={school.trial_ends_at} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                      <span>📍 {school.city}, {school.country}</span>
                      <span>👤 {school.adminName} — {school.adminEmail}</span>
                      <span>📅 Inscrit le {new Date(school.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-white">{school.studentCount}</span>
                        <span className="text-xs text-slate-500">étudiants</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-white">{school.teacherCount}</span>
                        <span className="text-xs text-slate-500">enseignants</span>
                      </div>
                      {school.status === 'trial' && !isExpired && daysLeft !== null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-bold text-amber-400">{daysLeft}j</span>
                          <span className="text-xs text-slate-500">restants</span>
                        </div>
                      )}
                      {school.status === 'active' && paidUntil && (
                        <span className="text-sm font-medium text-green-400">
                          Payé jusqu'au {paidUntil.toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {school.status !== 'active' && (
                      <>
                        <button onClick={() => updateStatus(school.id, 'active', 1)}
                          disabled={updating === school.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition disabled:opacity-50">
                          {updating === school.id ? '...' : '✅ 1 mois'}
                        </button>
                        <button onClick={() => updateStatus(school.id, 'active', 12)}
                          disabled={updating === school.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition disabled:opacity-50">
                          {updating === school.id ? '...' : '✅ 1 an'}
                        </button>
                      </>
                    )}
                    {school.status === 'active' && (
                      <>
                        <button onClick={() => updateStatus(school.id, 'active', 1)}
                          disabled={updating === school.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition disabled:opacity-50">
                          {updating === school.id ? '...' : '🔄 +1 mois'}
                        </button>
                        <button onClick={() => updateStatus(school.id, 'active', 12)}
                          disabled={updating === school.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition disabled:opacity-50">
                          {updating === school.id ? '...' : '🔄 +1 an'}
                        </button>
                      </>
                    )}
                    {isExpired && (
                      <button onClick={() => updateStatus(school.id, 'trial')}
                        disabled={updating === school.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition disabled:opacity-50">
                        {updating === school.id ? '...' : '🔁 Reset essai 30j'}
                      </button>
                    )}
                    {school.status === 'active' && (
                      <button onClick={() => updateStatus(school.id, 'inactive')}
                        disabled={updating === school.id}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition disabled:opacity-50">
                        {updating === school.id ? '...' : '🚫 Désactiver'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}