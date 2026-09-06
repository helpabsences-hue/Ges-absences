// app/api/queue-invitations/route.ts
// Adds students to invitation queue
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_ids } = await request.json()
  if (!student_ids?.length) return NextResponse.json({ error: 'No students' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles').select('school_id').eq('id', user.id).single()

  if (!profile?.school_id) return NextResponse.json({ error: 'No school' }, { status: 400 })

  // Fetch students with parent emails
  const { data: students } = await supabase
    .from('students')
    .select('id, name, parent_email, parent_name')
    .in('id', student_ids)
    .eq('school_id', profile.school_id)
    .not('parent_email', 'is', null)

  if (!students?.length) return NextResponse.json({ queued: 0 })

  // Add to queue (skip already invited)
  const rows = students
    .filter(s => s.parent_email)
    .map(s => ({
      school_id:    profile.school_id,
      student_id:   s.id,
      parent_email: s.parent_email,
      parent_name:  s.parent_name || '',
      student_name: s.name,
      status:       'pending',
    }))

  const { error } = await supabase.from('invitation_queue').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update student status to queued
  await supabase.from('students')
    .update({ parent_invite_status: 'queued' })
    .in('id', student_ids)

  // Trigger first batch immediately
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invite-batch`, { method: 'POST' })
    .catch(err => console.error('Batch trigger error:', err))

  return NextResponse.json({ queued: rows.length })
}