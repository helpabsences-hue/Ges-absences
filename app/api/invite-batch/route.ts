// app/api/invite-batch/route.ts
// Processes invitation queue — sends 50 emails per call
import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'

const BATCH_SIZE = 50

export async function POST() {
  const supabase = await createClient()

  const { data: batch, error } = await supabase
    .from('invitation_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error || !batch || batch.length === 0) {
    return NextResponse.json({ sent: 0, remaining: 0 })
  }

  let sent = 0
  let failed = 0

  for (const item of batch) {
    try {
      // Generate password reset link
      const admin = (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type:    'invite',
        email:   item.parent_email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login` },
      })

      if (linkError || !linkData) throw new Error(linkError?.message ?? 'Link error')

      const inviteUrl = linkData.properties?.action_link ?? ''
      const userId    = linkData.user?.id

      // Create parent profile if user was just created
      if (userId) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()

        if (!existingProfile) {
          await admin.from('profiles').insert({
            id:         userId,
            name:       item.parent_name || 'Parent',
            email:      item.parent_email,
            role:       'parent',
            school_id:  item.school_id,
            student_id: item.student_id,
          })
        }
      }

      // Send via Brevo
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY! },
        body: JSON.stringify({
          sender:      { name: 'Attendefy', email: process.env.FROM_EMAIL },
          to:          [{ email: item.parent_email, name: item.parent_name || 'Parent' }],
          subject:     'Votre espace parent — Attendefy',
          htmlContent: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
              <h2 style="color:#2563eb">Attendefy — Espace Parent</h2>
              <p>Bonjour ${item.parent_name || 'Parent'},</p>
              <p>L'établissement a créé un compte parent pour suivre les absences de <strong>${item.student_name}</strong>.</p>
              <p>Cliquez ci-dessous pour créer votre mot de passe :</p>
              <a href="${inviteUrl}"
                style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
                Créer mon mot de passe
              </a>
              <p style="color:#64748b;font-size:13px">Ce lien expire dans 24h.</p>
            </div>
          `,
        }),
      })

      if (!res.ok) throw new Error('Brevo error')

      await supabase.from('invitation_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id)

      await supabase.from('students')
        .update({ parent_invite_status: 'invited' })
        .eq('id', item.student_id)

      sent++
    } catch (err) {
      console.error('Failed:', item.parent_email, err)
      await supabase.from('invitation_queue').update({ status: 'failed' }).eq('id', item.id)
      failed++
    }
  }

  const { count: remaining } = await supabase
    .from('invitation_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ sent, failed, remaining: remaining ?? 0 })
}