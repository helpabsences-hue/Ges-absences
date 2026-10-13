// app/api/db-storage/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET() {
  // Only the platform admin can see storage stats of all schools
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get total DB size
  const { data: totalData } = await admin.rpc('get_db_size')

  // Get per-school stats
  const { data: schoolStats } = await admin.rpc('get_school_storage_stats')

  return NextResponse.json({
    totalMB:     totalData ?? 0,
    schoolStats: schoolStats ?? [],
  })
}