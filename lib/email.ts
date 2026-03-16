// lib/email.ts

const BREVO_API_KEY = process.env.BREVO_API_KEY!
const FROM_EMAIL    = process.env.FROM_EMAIL || 'noreply@attendify.app'
const FROM_NAME     = 'Attendify'
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
  const roleLabel  = role === 'admin' ? 'Administrator' : 'Teacher'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f1f5f9; margin: 0; padding: 40px 16px; }
    .wrap { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .head { background: linear-gradient(135deg,#1e40af,#3b82f6); padding: 36px; text-align: center; }
    .logo { color: #fff; font-size: 26px; font-weight: 800; letter-spacing: -.5px; }
    .logo span { color: #93c5fd; }
    .body { padding: 36px; }
    h2 { color: #1e293b; font-size: 20px; margin: 0 0 12px; }
    p  { color: #475569; line-height: 1.65; margin: 0 0 14px; font-size: 15px; }
    .badge { display:inline-block; background:#eff6ff; color:#1d4ed8; padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; margin-bottom:20px; }
    .btn { display:block; background:#1d4ed8; color:#fff; text-decoration:none; text-align:center; padding:15px 32px; border-radius:10px; font-weight:700; font-size:15px; margin:24px 0; }
    .link { word-break:break-all; color:#3b82f6; font-size:13px; }
    .foot { padding:20px 36px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; }
    .foot p { color:#94a3b8; font-size:12px; margin:0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="logo">Attend<span>ify</span></div>
    </div>
    <div class="body">
      <span class="badge">${roleLabel} Invitation</span>
      <h2>You've been invited to join ${schoolName}</h2>
      <p>
        <strong>${inviterName}</strong> has invited you to join
        <strong>${schoolName}</strong> on Attendify as a <strong>${roleLabel}</strong>.
      </p>
      <p>Click the button below to set up your account and get started.</p>
      <a href="${inviteUrl}" class="btn">Accept Invitation →</a>
      <p style="font-size:13px;color:#94a3b8;">Or copy this link:</p>
      <p class="link">${inviteUrl}</p>
      <p style="font-size:13px;color:#94a3b8;margin-top:20px;">
        This invitation expires in 7 days. If you weren't expecting this, ignore it.
      </p>
    </div>
    <div class="foot">
      <p>© ${new Date().getFullYear()} Attendify. All rights reserved.</p>
    </div>
  </div>
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
      subject:     `You're invited to join ${schoolName} on Attendify`,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Brevo error: ${JSON.stringify(err)}`)
  }
}
