// app/api/resend-parent-invite/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id } = await request.json()
  if (!student_id) return NextResponse.json({ error: 'No student_id' }, { status: 400 })

  // Get student info
  const { data: student } = await supabase
    .from('students')
    .select('id, name, parent_email, parent_name, school_id')
    .eq('id', student_id)
    .single()

  if (!student?.parent_email) {
    return NextResponse.json({ error: 'No parent email' }, { status: 400 })
  }

  // Reset status to not_invited so they can be re-queued
  await supabase.from('students')
    .update({ parent_invite_status: 'not_invited' })
    .eq('id', student_id)

  // Delete old failed/sent queue entries
  await supabase.from('invitation_queue')
    .delete()
    .eq('student_id', student_id)

  // Add back to queue
  await supabase.from('invitation_queue').insert({
    school_id:    student.school_id,
    student_id:   student.id,
    parent_email: student.parent_email,
    parent_name:  student.parent_name || '',
    student_name: student.name,
    status:       'pending',
  })

  // Update status to queued
  await supabase.from('students')
    .update({ parent_invite_status: 'queued' })
    .eq('id', student_id)

  // Trigger batch send
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invite-batch`, { method: 'POST' })
    .catch(console.error)

  return NextResponse.json({ success: true })
}