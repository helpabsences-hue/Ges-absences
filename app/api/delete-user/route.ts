// app/api/delete-user/route.ts
// Deletes user from both profiles table and Supabase Auth
import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Which roles each caller role is allowed to delete
const CAN_DELETE: Record<string, string[]> = {
  platform_admin: ['super_admin', 'admin', 'teacher', 'parent'],
  super_admin:    ['admin', 'teacher', 'parent'],
  admin:          ['teacher', 'parent'],
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  const allowed = profile ? CAN_DELETE[profile.role] : undefined
  if (!profile || !allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user_id } = await request.json().catch(() => ({}))
  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }
  if (user_id === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  const admin = createServiceClient()

  // The target must exist, have a role the caller may delete,
  // and (except for the platform admin) belong to the caller's school
  const { data: target } = await admin
    .from('profiles')
    .select('role, school_id')
    .eq('id', user_id)
    .maybeSingle()

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!allowed.includes(target.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (profile.role !== 'platform_admin' && target.school_id !== profile.school_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete from Supabase Auth (this also cascades to profiles via FK)
  const { error } = await admin.auth.admin.deleteUser(user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
