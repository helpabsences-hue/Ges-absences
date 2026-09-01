// app/api/invite-parent/route.ts
import { createServiceClient } from '@/lib/supabase/server'
import { createClient }        from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { student_id, parent_email, parent_name, student_name, school_name } = await request.json()

  if (!student_id || !parent_email) {
    return NextResponse.json({ error: 'student_id and parent_email required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get caller's school_id to pass to parent profile
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  const school_id = callerProfile?.school_id ?? null

  const admin = createServiceClient()

  // ── Check if parent profile already exists ────────────────────
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', parent_email)
    .eq('role', 'parent')
    .maybeSingle()

  if (existingProfile) {
    // Just update the student link
    await admin.from('profiles')
      .update({ student_id })
      .eq('id', existingProfile.id)
    return NextResponse.json({ success: true, action: 'linked' })
  }

  // ── Get or create auth user ───────────────────────────────────
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existingAuthUser = existingUsers?.users?.find((u: any) => u.email === parent_email)

  let userId: string

  if (existingAuthUser) {
    userId = existingAuthUser.id
  } else {
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email:         parent_email,
      password:      tempPassword,
      email_confirm: true,
      user_metadata: { name: parent_name ?? 'Parent' },
    })
    if (authError || !authData.user) {
      console.error('invite-parent auth error:', authError?.message)
      return NextResponse.json({ error: authError?.message }, { status: 400 })
    }
    userId = authData.user.id
  }

  // ── Check if profile already exists for this user ─────────────
  const { data: existingProfileById } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfileById) {
    // Profile exists but not as parent — update it
    await admin.from('profiles').update({
      role: 'parent', student_id,
    }).eq('id', userId)
  } else {
    // Create new parent profile
    const insertData: any = {
      id:         userId,
      name:       parent_name ?? 'Parent de ' + student_name,
      email:      parent_email,
      role:       'parent',
      student_id: student_id,
    }
    // Only add school_id if not null (avoid NOT NULL constraint)
    if (school_id) insertData.school_id = school_id

    const { error: profileError } = await admin.from('profiles').insert(insertData)
    if (profileError) {
      console.error('invite-parent profile error:', profileError.message)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
  }

  // ── Send invitation email ─────────────────────────────────────
  const BREVO_API_KEY = process.env.BREVO_API_KEY!
  const FROM_EMAIL    = process.env.FROM_EMAIL ?? 'noreply@attendefy.com'
  const appUrl        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.attendefy.com'

  const { data: linkData } = await admin.auth.admin.generateLink({
    type:    'recovery',
    email:   parent_email,
    options: { redirectTo: appUrl + '/auth/reset-password' },
  })

  const resetLink = (linkData as any)?.properties?.action_link ?? appUrl + '/auth/reset-password'

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({
      sender:      { name: 'Attendefy', email: FROM_EMAIL },
      to:          [{ email: parent_email, name: parent_name ?? 'Parent' }],
      subject:     `Votre espace parent — ${school_name}`,
      htmlContent: `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
  <div style="background:#1e40af;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:20px;">Attend<span style="color:#93c5fd;">efy</span></h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">${school_name}</p>
  </div>
  <div style="background:#f8fafc;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
    <h2 style="color:#0f172a;font-size:18px;margin-top:0;">Bonjour ${parent_name ?? 'Parent'},</h2>
    <p style="color:#334155;font-size:14px;line-height:1.6;">
      Un espace parent a été créé pour vous sur <strong>Attendefy</strong> 
      afin de suivre l'assiduité de <strong>${student_name}</strong>.
    </p>
    <p style="color:#334155;font-size:14px;">Cliquez ci-dessous pour définir votre mot de passe :</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetLink}"
         style="background:#1e40af;color:#fff;padding:13px 32px;border-radius:8px;
                text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
        Créer mon mot de passe
      </a>
    </div>
    <p style="color:#64748b;font-size:12px;text-align:center;">
      Ce lien expire dans 24h.<br>
      Si vous n'êtes pas le parent de ${student_name}, ignorez cet email.
    </p>
  </div>
</div>`,
    }),
  })

  return NextResponse.json({ success: true, action: 'created' })
}