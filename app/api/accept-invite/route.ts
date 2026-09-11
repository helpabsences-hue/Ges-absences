// app/api/accept-invite/route.ts
// Called after parent logs in — updates invite status to accepted
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Update ALL students with this parent email — handles multiple children
  const { error } = await admin
    .from('students')
    .update({ parent_invite_status: 'accepted' })
    .eq('parent_email', user.email)

  if (error) {
    console.error('Accept invite error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}