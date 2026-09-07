// app/api/db-storage/route.ts
import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET() {
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