// app/api/delete-user/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { createClient }        from '@/lib/supabase/server'
import { NextResponse }        from 'next/server'

export async function POST(request: Request) {
  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Verify caller is admin or super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role, school_id').eq('id', user.id).single()

  if (!caller || caller.role === 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the user being deleted belongs to the same school
  const { data: target } = await supabase
    .from('profiles').select('school_id, role').eq('id', userId).single()

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (target.school_id !== caller.school_id) {
    return NextResponse.json({ error: 'Cannot delete user from another school' }, { status: 403 })
  }

  // Admin cannot delete another admin — only super_admin can
  if (target.role === 'admin' && caller.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can delete admins' }, { status: 403 })
  }

  const admin = createServiceClient()

  // Step 1: Delete related data first
  await admin.from('teacher_planning').delete().eq('teacher_id', userId)
  await admin.from('attendance').delete().eq('student_id', userId)

  // Step 2: Delete profile (cascade handles most relations via FK)
  await admin.from('profiles').delete().eq('id', userId)

  // Step 3: Delete from Supabase Auth — this is the key step
  const { error: authError } = await admin.auth.admin.deleteUser(userId)

  if (authError) {
    console.error('Auth delete error:', authError.message)
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
