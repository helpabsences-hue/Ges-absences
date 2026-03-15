// app/api/invite/route.ts
import { createClient } from '@/lib/supabase/server'
import { sendInvitationEmail } from '@/lib/email'
import { NextResponse, type NextRequest } from 'next/server'
import type { InvitePayload } from '@/types'

export async function POST(request: NextRequest) {
  const body: InvitePayload = await request.json()
  const { email, role } = body

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required.' }, { status: 400 })
  }

  const supabase = await createClient()

  // ── Verify caller ──────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('*, schools(name)')
    .eq('id', user.id)
    .single()

  if (!caller) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })

  if (caller.role === 'teacher') {
    return NextResponse.json({ error: 'Teachers cannot send invitations.' }, { status: 403 })
  }
  if (caller.role === 'admin' && role !== 'teacher') {
    return NextResponse.json({ error: 'Admins can only invite teachers.' }, { status: 403 })
  }

  // ── Check duplicate ────────────────────────────────────
  const { data: existing } = await supabase
    .from('invitations')
    .select('id, status')
    .eq('email', email)
    .eq('school_id', caller.school_id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'A pending invitation already exists for this email.' },
      { status: 409 }
    )
  }

  // ── Create invitation row ──────────────────────────────
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({ email, role, school_id: caller.school_id })
    .select()
    .single()

  if (inviteError || !invitation) {
    console.error('Invite insert error:', inviteError)
    return NextResponse.json(
      { error: inviteError?.message ?? 'Failed to create invitation.' },
      { status: 500 }
    )
  }

  // ── Send email (non-blocking — invitation is created regardless) ──
  let emailError: string | null = null
  try {
    await sendInvitationEmail({
      to:          email,
      role,
      schoolName:  (caller.schools as any)?.name ?? 'Your School',
      token:       invitation.token,
      inviterName: caller.name,
    })
  } catch (err: any) {
    emailError = err.message
    console.error('Brevo email error:', err.message)
  }

  // Always return success — invitation row exists, admin can copy link from DB
  // but also surface the email error as a warning so admin knows
  return NextResponse.json({
    success: true,
    token: invitation.token,                          // handy for manual sharing
    inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/auth/invite?token=${invitation.token}`,
    emailError: emailError ?? null,                   // null = email sent fine
  })
}