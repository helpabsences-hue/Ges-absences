// app/api/accept-invite/route.ts
// Called after parent creates password — updates invite status to accepted
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service role to bypass RLS
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Update by parent_email
  const { error } = await admin
    .from('students')
    .update({ parent_invite_status: 'accepted' })
    .eq('parent_email', user.email)

  if (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also update by student_id if profile has it
  const { data: profile } = await admin
    .from('profiles')
    .select('student_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.student_id) {
    await admin
      .from('students')
      .update({ parent_invite_status: 'accepted' })
      .eq('id', profile.student_id)
  }

  return NextResponse.json({ success: true })
}