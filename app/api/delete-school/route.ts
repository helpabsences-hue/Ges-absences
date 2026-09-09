// app/api/delete-school/route.ts
// Deletes school + all auth users belonging to it
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only platform_admin can delete schools
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { school_id } = await request.json()
  if (!school_id) return NextResponse.json({ error: 'school_id required' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Get all user IDs belonging to this school
  const { data: profiles } = await admin
    .from('profiles')
    .select('id')
    .eq('school_id', school_id)

  // 2. Delete all auth users
  if (profiles && profiles.length > 0) {
    await Promise.all(
      profiles.map((p: any) => admin.auth.admin.deleteUser(p.id))
    )
  }

  // 3. Delete school (CASCADE handles all related data)
  const { error } = await admin
    .from('schools')
    .delete()
    .eq('id', school_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}