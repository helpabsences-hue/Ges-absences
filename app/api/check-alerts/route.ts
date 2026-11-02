// app/api/check-alerts/route.ts
// Called after every attendance save — checks if any student hit the threshold
import { createServiceClient } from '@/lib/supabase/server'
import { createClient }        from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { escapeHtml } from '@/lib/utils'

const BREVO_API_KEY = process.env.BREVO_API_KEY!
const FROM_EMAIL    = process.env.FROM_EMAIL || 'noreply@attendefy.com'
const FROM_NAME     = 'Attendefy'

export async function POST(request: NextRequest) {
  const { school_id } = await request.json().catch(() => ({}))
  if (!school_id) return NextResponse.json({ error: 'school_id required' }, { status: 400 })

  // Verify caller — only staff of this school can trigger its alerts
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role, school_id').eq('id', user.id).single()
  if (!caller || !['super_admin', 'admin', 'teacher'].includes(caller.role) || caller.school_id !== school_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createServiceClient()

  // Get school threshold
  const { data: school } = await admin
    .from('schools')
    .select('absence_threshold, name, language')
    .eq('id', school_id)
    .single()

  const threshold = school?.absence_threshold ?? 3
  const schoolLang = school?.language ?? 'fr'

  // Count absences per student in this school with session details.
  // Supabase returns at most 1000 rows per request, so read page by page.
  const absenceCounts: any[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data: page, error: pageErr } = await admin
      .from('attendance')
    .select(`
      student_id,
      students!inner ( id, name, parent_name, parent_phone, parent_email, school_id ),
      class_sessions (
        session_date,
        teacher_planning (
          start_time,
          end_time,
          courses ( name )
        )
      )
    `)
      .eq('status', 'absent')
      .eq('students.school_id', school_id)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (pageErr) {
      console.error('check-alerts query error:', pageErr.message)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }
    absenceCounts.push(...(page ?? []))
    if (!page || page.length < PAGE) break
  }

  if (absenceCounts.length === 0) {
    return NextResponse.json({ checked: 0, alerted: 0 })
  }

  // Count per student + collect session details
  const countMap: Record<string, { count: number; student: any; sessions: any[] }> = {}
  for (const row of absenceCounts as any[]) {
    const sid = row.student_id
    if (!countMap[sid]) countMap[sid] = { count: 0, student: row.students, sessions: [] }
    countMap[sid].count++
    if (row.class_sessions) {
      countMap[sid].sessions.push({
        date:      row.class_sessions.session_date,
        start:     row.class_sessions.teacher_planning?.start_time?.slice(0, 5) ?? '',
        end:       row.class_sessions.teacher_planning?.end_time?.slice(0, 5) ?? '',
        course:    row.class_sessions.teacher_planning?.courses?.name ?? '—',
      })
    }
  }

  // Find students who hit or exceeded threshold
  const toAlert = Object.entries(countMap).filter(([, v]) => v.count >= threshold)

  console.log('check-alerts: threshold=' + threshold + ', students to check=' + toAlert.length)
  let alerted = 0
  for (const [studentId, { count, student }] of toAlert) {
    // Check if we already sent an alert for this absence level
    const nextAlertAt = Math.floor(count / threshold) * threshold
    const { data: existingRows } = await admin
      .from('absence_alerts')
      .select('id')
      .eq('student_id', studentId)
      .gte('absences', nextAlertAt)
      .limit(1)

    if (existingRows && existingRows.length > 0) {
      continue
    }

    // Send email if parent has email
    if (student.parent_email) {
      try {
      await sendAlertEmail({
        parentEmail: student.parent_email,
        parentName:  student.parent_name ?? 'Parent',
        studentName: student.name,
        absences:    count,
        threshold,
        schoolName:  school?.name ?? 'Attendefy',
        sessions:    countMap[studentId].sessions,
        lang:        schoolLang,
      })
      } catch (err: any) {
        // Don't record the alert, so it is retried next time
        console.error('check-alerts email error:', err?.message)
        continue
      }
    }

    // Record the alert
    await admin.from('absence_alerts').insert({
      student_id: studentId,
      school_id,
      absences:   count,
      threshold,
    })

    alerted++
  }

  return NextResponse.json({ checked: toAlert.length, alerted })
}

async function sendAlertEmail({
  parentEmail, parentName, studentName, absences, threshold, schoolName, sessions, lang = 'fr'
}: {
  parentEmail: string
  parentName:  string
  studentName: string
  absences:    number
  threshold:   number
  schoolName:  string
  sessions:    { date: string; start: string; end: string; course: string }[]
  lang?:       string
}) {
  // Names are typed by users — escape them before building the HTML
  const rawStudent = studentName, rawSchool = schoolName
  parentName  = escapeHtml(parentName)
  studentName = escapeHtml(studentName)
  schoolName  = escapeHtml(schoolName)
  sessions    = sessions.map(s => ({ ...s, course: escapeHtml(s.course) }))
  const t = {
    fr: {
      subject:   `⚠️ Alerte absences — ${rawStudent} (${rawSchool})`,
      title:     "Alerte d'absences",
      subtitle:  'Information importante concernant votre enfant',
      greeting:  `Bonjour <strong>${parentName}</strong>,`,
      body:      `Nous vous informons que votre enfant <strong>${studentName}</strong> a atteint <strong style="color:#dc2626;">${absences} absences</strong> cette période, ce qui dépasse le seuil autorisé de <strong>${threshold} absences</strong>.`,
      tableTitle:`📋 Récapitulatif : ${absences} absence(s) enregistrée(s)`,
      date:      'Date', subject2: 'Matière', time: 'Horaire',
      footer:    `Nous vous invitons à contacter l'établissement pour plus d'informations.`,
      auto:      `Ce message est envoyé automatiquement par ${schoolName} via Attendefy.`,
    },
    en: {
      subject:   `⚠️ Absence Alert — ${rawStudent} (${rawSchool})`,
      title:     'Absence Alert',
      subtitle:  'Important information about your child',
      greeting:  `Hello <strong>${parentName}</strong>,`,
      body:      `We inform you that your child <strong>${studentName}</strong> has reached <strong style="color:#dc2626;">${absences} absences</strong> this period, which exceeds the allowed threshold of <strong>${threshold} absences</strong>.`,
      tableTitle:`📋 Summary: ${absences} absence(s) recorded`,
      date:      'Date', subject2: 'Subject', time: 'Time',
      footer:    'Please contact the school for more information.',
      auto:      `This message is sent automatically by ${schoolName} via Attendefy.`,
    },
    ar: {
      subject:   `⚠️ تنبيه غياب — ${rawStudent} (${rawSchool})`,
      title:     'تنبيه غياب',
      subtitle:  'معلومات مهمة تخص طفلكم',
      greeting:  `مرحباً <strong>${parentName}</strong>،`,
      body:      `نعلمكم أن طفلكم <strong>${studentName}</strong> بلغ <strong style="color:#dc2626;">${absences} غيابات</strong> في هذه الفترة، مما يتجاوز الحد المسموح به وهو <strong>${threshold} غيابات</strong>.`,
      tableTitle:`📋 ملخص: ${absences} غياب(ات) مسجلة`,
      date:      'التاريخ', subject2: 'المادة', time: 'التوقيت',
      footer:    'نرجو التواصل مع المؤسسة للمزيد من المعلومات.',
      auto:      `تم إرسال هذه الرسالة تلقائياً من ${schoolName} عبر Attendefy.`,
    },
  }
  const l = (t as any)[lang] ?? t.fr
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;direction:${dir};">
  <div style="background:#1e40af;padding:28px 36px;text-align:center;border-radius:12px 12px 0 0;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">
      Attend<span style="color:#93c5fd;">efy</span>
    </h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:12px;">${schoolName}</p>
  </div>
  <div style="background:#f8fafc;padding:32px 36px;border:1px solid #e2e8f0;border-top:none;">
    <div style="background:#fff;border-radius:10px;padding:28px;border:1px solid #e2e8f0;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="width:52px;height:52px;background:#fef2f2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="font-size:22px;">⚠️</span>
        </div>
        <h2 style="margin:0 0 6px;color:#0f172a;font-size:18px;font-weight:700;">${l.title}</h2>
        <p style="margin:0;color:#64748b;font-size:13px;">${l.subtitle}</p>
      </div>
      <p style="color:#334155;font-size:14px;line-height:1.6;">${l.greeting}</p>
      <p style="color:#334155;font-size:14px;line-height:1.6;">${l.body}</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin:20px 0;">
        <p style="margin:0 0 10px;color:#991b1b;font-size:13px;font-weight:600;">${l.tableTitle}</p>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#fee2e2;">
              <th style="padding:6px 10px;text-align:left;color:#7f1d1d;">${l.date}</th>
              <th style="padding:6px 10px;text-align:left;color:#7f1d1d;">${l.subject2}</th>
              <th style="padding:6px 10px;text-align:left;color:#7f1d1d;">${l.time}</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.sort((a, b) => a.date.localeCompare(b.date)).map((s, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#fef9f9'};">
              <td style="padding:6px 10px;color:#374151;border-bottom:1px solid #fecaca;">
                ${new Date(s.date + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td style="padding:6px 10px;color:#374151;border-bottom:1px solid #fecaca;">${s.course}</td>
              <td style="padding:6px 10px;color:#374151;border-bottom:1px solid #fecaca;font-family:monospace;">${s.start} – ${s.end}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p style="color:#334155;font-size:13px;line-height:1.6;">${l.footer}</p>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;">
        ${l.auto}<br>
        ${lang !== 'ar' ? 'Merci de ne pas y répondre directement.' : 'يرجى عدم الرد على هذه الرسالة مباشرةً.'}
      </p>
    </div>
  </div>
  <div style="padding:16px;text-align:center;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
    <p style="margin:0;color:#94a3b8;font-size:11px;">© 2025 Attendefy</p>
  </div>
</div>`

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': BREVO_API_KEY },
    body: JSON.stringify({
      sender:      { name: FROM_NAME, email: FROM_EMAIL },
      to:          [{ email: parentEmail, name: parentName }],
      subject:     l.subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) throw new Error('Brevo error: ' + res.status + ' ' + (await res.text()))
}