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

  // 1. Remember the accounts of this school (profiles are removed with the school)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role')
    .eq('school_id', school_id)
  const userIds = (profiles ?? []).filter((p: any) => p.role !== 'platform_admin').map((p: any) => p.id)

  // 2. Delete the school first (CASCADE removes students, absences, payments, profiles…)
  //    If this fails, nothing else is touched.
  const { error } = await admin.from('schools').delete().eq('id', school_id)
  if (error) {
    console.error('delete-school error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 3. Then delete the login accounts
  const results = await Promise.all(userIds.map((id: string) => admin.auth.admin.deleteUser(id)))
  const failed  = results.filter(r => r.error).length
  if (failed > 0) console.error(`delete-school: ${failed} account(s) not deleted`)

  return NextResponse.json({ success: true, accountsDeleted: userIds.length - failed, accountsFailed: failed })
}