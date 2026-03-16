// app/api/register/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { createClient }        from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { RegisterPayload } from '@/types'

export async function POST(request: NextRequest) {
  const body: RegisterPayload = await request.json()
  const { schoolName, city, ownerName, email, password } = body

  if (!schoolName || !city || !ownerName || !email || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL
  const fwdHost  = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const baseUrl  = appUrl ?? (fwdHost ? `${fwdProto}://${fwdHost}` : 'https://attendeffy.vercel.app')

  // ── Step 1: Sign up via regular auth — this SENDS the confirmation email ──
  // We use the server client (anon key) for signUp so Supabase triggers the email
  const supabaseAuth = await createClient()
  const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${baseUrl}/auth/login`,
      data: { name: ownerName },
    },
  })

  if (signUpError || !signUpData.user) {
    return NextResponse.json(
      { error: signUpError?.message ?? 'Failed to create account.' },
      { status: 400 }
    )
  }

  const userId = signUpData.user.id

  // ── Step 2: Create school + profile with service role (bypasses RLS) ──
  const admin = createServiceClient()

  const { data: school, error: schoolError } = await admin
    .from('schools')
    .insert({ name: schoolName, city, country: 'Morocco' })
    .select()
    .single()

  if (schoolError || !school) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Failed to create school.' }, { status: 500 })
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id:        userId,
    name:      ownerName,
    email,
    role:      'super_admin',
    school_id: school.id,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId)
    await admin.from('schools').delete().eq('id', school.id)
    return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
