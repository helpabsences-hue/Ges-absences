// app/api/school-director/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  // Only platform_admin can use this
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'platform_admin') return NextResponse.json(null, { status: 403 })

  const school_id = request.nextUrl.searchParams.get('school_id')
  if (!school_id) return NextResponse.json(null, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await admin
    .from('profiles')
    .select('name, email, role')
    .eq('school_id', school_id)
    .eq('role', 'super_admin')
    .limit(1)
    .maybeSingle()

  return NextResponse.json(data)
}