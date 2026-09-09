// app/api/school-stats/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') return NextResponse.json(null, { status: 403 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: schools } = await admin.from('schools').select('id')
  if (!schools) return NextResponse.json([])

  const stats = await Promise.all(schools.map(async (s: any) => {
    const [
      { count: studentCount },
      { count: teacherCount },
      { data: director },
    ] = await Promise.all([
      admin.from('students').select('*', { count: 'exact', head: true }).eq('school_id', s.id),
      admin.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', s.id).eq('role', 'teacher'),
      admin.from('profiles').select('name, email').eq('school_id', s.id).eq('role', 'super_admin').limit(1).maybeSingle(),
    ])

    const { data: studentIds } = await admin.from('students').select('id').eq('school_id', s.id)
    let attendanceCount = 0
    let sessionCount = 0

    if (studentIds && studentIds.length > 0) {
      const sIds = studentIds.map((st: any) => st.id)
      const { count: attCount } = await admin.from('attendance').select('*', { count: 'exact', head: true }).in('student_id', sIds)
      attendanceCount = attCount ?? 0
    }

    const { data: plannings } = await admin.from('teacher_planning').select('id').eq('school_id', s.id)
    if (plannings && plannings.length > 0) {
      const pIds = plannings.map((p: any) => p.id)
      const { count: sCount } = await admin.from('class_sessions').select('*', { count: 'exact', head: true }).in('planning_id', pIds)
      sessionCount = sCount ?? 0
    }

    const storageMB = Math.round(((studentCount ?? 0) * 500 + attendanceCount * 200 + sessionCount * 300) / (1024 * 1024) * 100) / 100

    return {
      school_id: s.id,
      studentCount:    studentCount    ?? 0,
      teacherCount:    teacherCount    ?? 0,
      attendanceCount: attendanceCount ?? 0,
      sessionCount:    sessionCount    ?? 0,
      storageMB:       storageMB       || 0.01,
      adminName:       director?.name  ?? '—',
      adminEmail:      director?.email ?? '—',
    }
  }))

  return NextResponse.json(stats)
}