// src/app/api/attendance/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Submit attendance for a session
export async function POST(request: Request) {
  const { session_id, records } = await request.json()
  // records: Array<{ student_id: string, status: 'present'|'absent'|'late', reason?: string }>

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the session belongs to this teacher
  const { data: session } = await supabase
    .from('class_sessions')
    .select('id, teacher_planning!inner(teacher_id)')
    .eq('id', session_id)
    .single()

  if (!session || (session.teacher_planning as any)?.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Session not found or not yours' }, { status: 403 })
  }

  // Upsert attendance records
  const upsertData = records.map((r: any) => ({
    session_id,
    student_id: r.student_id,
    status: r.status,
    reason: r.reason || null,
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(upsertData, { onConflict: 'session_id,student_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// GET: Fetch attendance for a session
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const session_id = searchParams.get('session_id')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(id, name, massar_code)')
    .eq('session_id', session_id!)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attendance: data })
}
