// app/api/accept-staff-invite/route.ts
// Handles teacher/admin invitation acceptance via token
import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { token, name, password } = await request.json()

  if (!token || !name || !password) {
    return NextResponse.json({ error: 'Token, name and password are required' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Find invitation by token
  const { data: invitation, error: invErr } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (invErr || !invitation) {
    return NextResponse.json({ error: 'Invalid or expired invitation link.' }, { status: 400 })
  }

  if (invitation.status === 'accepted') {
    return NextResponse.json({ error: 'This invitation has already been used.' }, { status: 400 })
  }

  // 2. Create user account
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email:             invitation.email,
    password,
    email_confirm:     true,
    user_metadata:     { name },
  })

  if (userErr || !userData.user) {
    // User might already exist — try to update password instead
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === invitation.email)
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, { password })
      // Update profile name
      await admin.from('profiles').update({ name }).eq('id', existing.id)
    } else {
      return NextResponse.json({ error: userErr?.message ?? 'Failed to create account.' }, { status: 500 })
    }
  }

  const userId = userData?.user?.id

  // 3. Create or update profile
  if (userId) {
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (existingProfile) {
      await admin.from('profiles').update({
        name, role: invitation.role,
      }).eq('id', userId)
    } else {
      await admin.from('profiles').insert({
        id:        userId,
        name,
        email:     invitation.email,
        role:      invitation.role,
        school_id: invitation.school_id,
      })
    }
  }

  // 4. Mark invitation as accepted
  await admin
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('token', token)

  return NextResponse.json({ success: true })
}