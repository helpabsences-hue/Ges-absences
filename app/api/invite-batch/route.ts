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
          subject:     `Invitation — Espace Parent Attendefy`,
          htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        
        <!-- Header -->
        <tr>
          <td style="background:#1e40af;padding:32px 40px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px">
              Attend<span style="color:#93c5fd">efy</span>
            </h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px">Gestion des absences scolaires</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 16px;color:#1e293b;font-size:15px">Bonjour <strong>${item.parent_name || 'Parent'}</strong>,</p>
            
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
              L'établissement vous invite à accéder à votre <strong>espace parent</strong> sur Attendefy pour suivre les absences et retards de votre enfant <strong style="color:#1e40af">${item.student_name}</strong>.
            </p>

            <!-- Info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:10px;margin-bottom:28px">
              <tr>
                <td style="padding:16px 20px">
                  <p style="margin:0 0 6px;color:#1e40af;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Ce que vous pouvez faire :</p>
                  <p style="margin:4px 0;color:#1e40af;font-size:13px">✅ Voir les absences et retards en temps réel</p>
                  <p style="margin:4px 0;color:#1e40af;font-size:13px">✅ Consulter l'historique des séances</p>
                  <p style="margin:4px 0;color:#1e40af;font-size:13px">✅ Recevoir des alertes en cas d'absence</p>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:28px">
                  <a href="${inviteUrl}"
                    style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px">
                    Créer mon mot de passe →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">
              ⏱ Ce lien est valable <strong>24 heures</strong>. Après expiration, contactez l'établissement pour recevoir un nouveau lien.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">
              Attendefy · Gestion des absences scolaires<br/>
              Si vous n'attendiez pas cet email, ignorez-le.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
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