// app/api/queue-invitations/route.ts
// Adds students to invitation queue
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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

  // Get emails of parents who already have an account
  const parentEmails = students.filter(s => s.parent_email).map(s => s.parent_email)
  const { data: existingProfiles } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'parent')
    .in('email', parentEmails)

  const existingEmails = new Set((existingProfiles ?? []).map((p: any) => p.email))

  // Only queue parents who don't have an account yet
  // For parents who already have an account → mark directly as accepted
  const alreadyRegistered = students.filter(s => existingEmails.has(s.parent_email))
  if (alreadyRegistered.length > 0) {
    await admin.from('students')
      .update({ parent_invite_status: 'accepted' })
      .in('id', alreadyRegistered.map(s => s.id))
  }

  // Add to queue (skip already invited or already registered)
  const rows = students
    .filter(s => s.parent_email && !existingEmails.has(s.parent_email))
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

  // Update student status to queued using admin to bypass RLS
  await admin.from('students')
    .update({ parent_invite_status: 'queued' })
    .in('id', student_ids)

  // Trigger first batch immediately
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invite-batch`, { method: 'POST' })
    .catch(err => console.error('Batch trigger error:', err))

  return NextResponse.json({ queued: rows.length })
}