// app/api/accept-staff-invite/route.ts
// Handles teacher/admin invitation acceptance via token
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const INVITE_VALID_DAYS = 30

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const token    = typeof body.token === 'string' ? body.token : ''
  const name     = String(body.name ?? '').trim()
  const password = String(body.password ?? '')

  if (!token || !name || !password) {
    return NextResponse.json({ error: 'Token, name and password are required' }, { status: 400 })
  }
  if (name.length > 80) {
    return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const admin = createServiceClient()

  // 1. Find invitation by token
  const { data: invitation } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!invitation || !['admin', 'teacher'].includes(invitation.role)) {
    return NextResponse.json({ error: 'Invalid or expired invitation link.' }, { status: 400 })
  }
  if (invitation.status === 'accepted') {
    return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 400 })
  }
  const age = Date.now() - new Date(invitation.created_at).getTime()
  if (invitation.created_at && age > INVITE_VALID_DAYS * 24 * 3600_000) {
    return NextResponse.json({ error: 'Invalid or expired invitation link.' }, { status: 400 })
  }

  // 2. Claim the invitation atomically, so the same link can't be used twice in parallel
  const { data: claimed } = await admin
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)
    .eq('status', 'pending')
    .select('id')
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 400 })
  }
  const release = () =>
    admin.from('invitations').update({ status: 'pending' }).eq('id', invitation.id)

  // 3. Create the account. If an account already exists for this email we do NOT
  //    change its password — the invite link would otherwise let anyone take it over.
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email:         invitation.email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (userErr || !userData.user) {
    await release()
    const exists = /already|registered|exists/i.test(userErr?.message ?? '')
    return NextResponse.json(
      { error: exists
          ? 'An account already exists for this email. Please sign in, or ask the school to use another email.'
          : (userErr?.message ?? 'Failed to create account.') },
      { status: exists ? 409 : 500 }
    )
  }

  // 4. Create the profile
  const { error: profileErr } = await admin.from('profiles').upsert({
    id:        userData.user.id,
    name,
    email:     invitation.email,
    role:      invitation.role,
    school_id: invitation.school_id,
  })

  if (profileErr) {
    console.error('accept-staff-invite profile error:', profileErr.message)
    await admin.auth.admin.deleteUser(userData.user.id)
    await release()
    return NextResponse.json({ error: 'Failed to create profile.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
