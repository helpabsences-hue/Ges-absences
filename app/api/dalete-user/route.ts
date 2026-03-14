// app/api/delete-user/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { createClient }        from '@/lib/supabase/server'
import { NextResponse }        from 'next/server'

export async function POST(request: Request) {
  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Only admins/super_admins can delete users
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!caller || caller.role === 'teacher') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete auth user with service role
  const admin = createServiceClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
