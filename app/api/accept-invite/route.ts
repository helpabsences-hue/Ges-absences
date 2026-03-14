// src/app/api/accept-invite/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AcceptInvitePayload } from '@/types'

export async function POST(request: Request) {
  const body: AcceptInvitePayload = await request.json()
  const { token, name, password } = body

  if (!token || !name || !password) {
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

  // Service role needed to create user + write profile
  const supabase = createServiceClient()

  // ── 1. Find valid pending invitation ──────────────────
  const { data: invitation, error: tokenError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (tokenError || !invitation) {
    return NextResponse.json(
      { error: 'Invalid or expired invitation link.' },
      { status: 400 }
    )
  }

  // ── 2. Create auth user ────────────────────────────────
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Failed to create account.' },
      { status: 400 }
    )
  }

  // ── 3. Create profile ─────────────────────────────────
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    name,
    email: invitation.email,
    role: invitation.role,
    school_id: invitation.school_id,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json(
      { error: 'Failed to create profile.' },
      { status: 500 }
    )
  }

  // ── 4. Mark invitation as accepted ────────────────────
  await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  return NextResponse.json({ success: true, role: invitation.role })
}