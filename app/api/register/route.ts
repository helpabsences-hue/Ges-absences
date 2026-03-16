// src/app/api/register/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { RegisterPayload } from '@/types'

export async function POST(request: NextRequest) {
  const body: RegisterPayload = await request.json()
  const { schoolName, city, ownerName, email, password } = body

  // ── Validate ───────────────────────────────────────────
  if (!schoolName || !city || !ownerName || !email || !password) {
    return NextResponse.json(
      { error: 'All fields are required.' },
      { status: 400 }
    )
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 }
    )
  }

  // Service role bypasses RLS for the full creation sequence
  const supabase = createServiceClient()

  // ── Compute public base URL ───────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const fwdHost = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const baseUrl = appUrl ?? (fwdHost ? `${fwdProto}://${fwdHost}` : new URL(request.url).origin)

  // ── 1. Create auth user ────────────────────────────────
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // auto-confirm, no email needed
      user_metadata: { name: ownerName },
    })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create user.' },
      { status: 400 }
    )
  }

  // ── 2. Create school ───────────────────────────────────
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .insert({ name: schoolName, city, country: 'Morocco' })
    .select()
    .single()

  if (schoolError || !school) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: 'Failed to create school.' },
      { status: 500 }
    )
  }

  // ── 3. Create super_admin profile ─────────────────────
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    name: ownerName,
    email,
    role: 'super_admin',
    school_id: school.id,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('schools').delete().eq('id', school.id)
    return NextResponse.json(
      { error: 'Failed to create profile.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
