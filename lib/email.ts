// lib/email.ts

const BREVO_API_KEY = process.env.BREVO_API_KEY!
const FROM_EMAIL    = process.env.FROM_EMAIL || 'noreply@attendefy.com'
const FROM_NAME     = 'Attendefy'
// Never fall back to localhost — always use the real production URL
const BASE_URL      = process.env.NEXT_PUBLIC_APP_URL || 'https://attendeffy.vercel.app'

interface SendInviteParams {
  to: string
  role: 'admin' | 'teacher'
  schoolName: string
  token: string
  inviterName: string
}

export async function sendInvitationEmail({
  to, role, schoolName, token, inviterName,
}: SendInviteParams): Promise<void> {
  const inviteUrl  = `${BASE_URL}/auth/invite?token=${token}`
  const roleLabel  = role === 'admin' ? 'Administrateur' : 'Enseignant'

  const html = `
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
            <p style="margin:0 0 8px;display:inline-block;background:#eff6ff;color:#1d4ed8;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600">
              Invitation — ${roleLabel}
            </p>
            <h2 style="margin:16px 0 12px;color:#1e293b;font-size:20px">
              Vous avez été invité(e) à rejoindre ${schoolName}
            </h2>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6">
              <strong>${inviterName}</strong> vous invite à rejoindre <strong>${schoolName}</strong> sur Attendefy en tant que <strong>${roleLabel}</strong>.<br/>
              Cliquez sur le bouton ci-dessous pour créer votre compte et commencer.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:28px">
                  <a href="${inviteUrl}"
                    style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                    Accepter l'invitation →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-align:center">
              Ou copiez ce lien dans votre navigateur :
            </p>
            <p style="margin:0 0 24px;text-align:center">
              <a href="${inviteUrl}" style="color:#2563eb;font-size:12px;word-break:break-all">
                ${inviteUrl}
              </a>
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center">
              ⏱ Cette invitation expire dans 7 jours. Si vous ne l'attendiez pas, ignorez cet email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">
              Attendefy · Gestion des absences scolaires<br/>
              © ${new Date().getFullYear()} Attendefy. Tous droits réservés.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender:      { name: FROM_NAME, email: FROM_EMAIL },
      to:          [{ email: to }],
      subject:     `Invitation à rejoindre ${schoolName} — Attendefy`,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Brevo error: ${JSON.stringify(err)}`)
  }
}

// ── Absence alert email to parent ─────────────────────────────────
interface SendAbsenceAlertParams {
  to:           string
  parentName:   string
  studentName:  string
  absenceCount: number
  threshold:    number
  schoolName:   string
}

export async function sendAbsenceAlert({
  to, parentName, studentName, absenceCount, threshold, schoolName,
}: SendAbsenceAlertParams): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key':      BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender:  { name: FROM_NAME, email: FROM_EMAIL },
      to:      [{ email: to, name: parentName }],
      subject: `⚠️ Alerte absences — ${studentName} — ${schoolName}`,
      htmlContent: `
<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;">
  <div style="background:#1e40af;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">
      Attend<span style="color:#93c5fd;">efy</span>
    </h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">Gestion des absences scolaires</p>
  </div>
  <div style="padding:32px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;">
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:56px;height:56px;background:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:12px;">⚠️</div>
        <h2 style="margin:0 0 8px;color:#0f172a;font-size:18px;font-weight:700;">Alerte d'absences</h2>
        <p style="margin:0;color:#64748b;font-size:14px;">Bonjour <strong>${parentName}</strong>,</p>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
        <p style="margin:0 0 8px;color:#dc2626;font-size:14px;">Votre enfant</p>
        <p style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:700;">${studentName}</p>
        <p style="margin:0;color:#dc2626;font-size:14px;">a atteint <strong>${absenceCount} absences</strong> (seuil: ${threshold})</p>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:16px 0 0;">
        Nous vous invitons à contacter l'école <strong>${schoolName}</strong> pour discuter de la situation et trouver des solutions adaptées.
      </p>
    </div>
  </div>
  <div style="padding:16px 32px;text-align:center;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">© 2025 Attendefy — ${schoolName}</p>
  </div>
</div>`,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error('Brevo error: ' + JSON.stringify(err))
  }
}