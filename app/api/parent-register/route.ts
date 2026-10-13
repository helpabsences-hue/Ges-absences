// app/api/parent-register/route.ts
// Public parent self-registration: Massar code + date of birth of each child.
//   GET  ?school=<id>                     → { name }  (school name for the page)
//   POST { action: 'verify', ... }        → check the children, return their names
//   POST { action: 'register', ... }      → create the parent account and link the children
import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const MAX_FAILS    = 10   // wrong code/date tries per IP per hour
const MAX_CHILDREN = 6

const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE_RE  = /^[A-Za-z0-9]{5,20}$/
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s.-]{7,19}$/

type Admin = ReturnType<typeof createServiceClient>
interface ChildIn { massar_code: string; date_of_birth: string }
interface Found   { id: string; name: string; group: string; parent_email: string | null }

const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status })

const ipOf = (req: NextRequest) =>
  (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'

async function getSchool(admin: Admin, id: unknown) {
  if (typeof id !== 'string' || !UUID_RE.test(id)) return null
  const { data } = await admin.from('schools').select('id, name, status').eq('id', id).maybeSingle()
  if (!data || data.status === 'inactive') return null
  return data
}

async function tooManyFails(admin: Admin, ip: string) {
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await admin.from('parent_register_attempts')
    .select('id', { count: 'exact', head: true }).eq('ip', ip).gte('created_at', since)
  return (count ?? 0) >= MAX_FAILS
}

// Returns the matching students, or the index of the first child that doesn't match
async function findChildren(admin: Admin, schoolId: string, children: ChildIn[], ip: string)
  : Promise<{ found: Found[] } | { badIndex: number }> {
  const found: Found[] = []
  for (let i = 0; i < children.length; i++) {
    const { massar_code, date_of_birth } = children[i]
    const { data } = await admin.from('students')
      .select('id, name, date_of_birth, parent_email, groups(name)')
      .eq('school_id', schoolId)
      .ilike('massar_code', massar_code)      // code is letters/digits only → exact match, any case
    const st = (data ?? []).find((s: any) => s.date_of_birth === date_of_birth) as any
    if (!st) {
      await admin.from('parent_register_attempts').insert({ ip })
      return { badIndex: i }
    }
    found.push({ id: st.id, name: st.name, group: st.groups?.name ?? '', parent_email: st.parent_email })
  }
  return { found }
}

function readChildren(raw: unknown): ChildIn[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_CHILDREN) return null
  const out: ChildIn[] = []
  for (const c of raw) {
    const massar_code   = String(c?.massar_code ?? '').trim()
    const date_of_birth = String(c?.date_of_birth ?? '').trim()
    if (!CODE_RE.test(massar_code) || !DATE_RE.test(date_of_birth)) return null
    out.push({ massar_code, date_of_birth })
  }
  const codes = out.map(c => c.massar_code.toUpperCase())
  if (new Set(codes).size !== codes.length) return null
  return out
}

export async function GET(request: NextRequest) {
  const admin  = createServiceClient()
  const school = await getSchool(admin, request.nextUrl.searchParams.get('school'))
  if (!school) return fail('school', 404)
  return NextResponse.json({ name: school.name })
}

export async function POST(request: NextRequest) {
  const admin = createServiceClient()
  const body  = await request.json().catch(() => ({}))
  const ip    = ipOf(request)

  const school = await getSchool(admin, body.school_id)
  if (!school) return fail('school', 404)

  if (await tooManyFails(admin, ip)) return fail('tooMany', 429)

  const children = readChildren(body.children)
  if (!children) return fail('invalid')

  const res = await findChildren(admin, school.id, children, ip)
  if ('badIndex' in res) return fail('notFound', 400, { index: res.badIndex })

  // ── Step 1: just confirm the children ──
  if (body.action === 'verify') {
    return NextResponse.json({ children: res.found.map(f => ({ name: f.name, group: f.group })) })
  }
  if (body.action !== 'register') return fail('invalid')

  // ── Step 2: create the account ──
  const parent_name  = String(body.parent_name  ?? '').trim()
  const parent_phone = String(body.parent_phone ?? '').trim()
  const email        = String(body.parent_email ?? '').trim().toLowerCase()
  const password     = String(body.password     ?? '')

  if (parent_name.length < 2 || parent_name.length > 80) return fail('name')
  if (!PHONE_RE.test(parent_phone))                       return fail('phone')
  if (!EMAIL_RE.test(email))                              return fail('email')
  if (password.length < 8)                                return fail('password')

  // A child already linked to ANOTHER registered parent can't be taken
  for (let i = 0; i < res.found.length; i++) {
    const other = res.found[i].parent_email?.trim().toLowerCase()
    if (!other || other === email) continue
    const { data: p } = await admin.from('profiles').select('id').eq('email', other).eq('role', 'parent').maybeSingle()
    if (p) return fail('linked', 400, { index: i })
  }

  // Parent who already has an account → just add the children (password unchanged)
  const { data: existing } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle()
  if (existing && existing.role !== 'parent') return fail('staffEmail')

  if (!existing) {
    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name: parent_name },
    })
    if (authErr || !created.user) return fail('emailTaken')

    const { error: profErr } = await admin.from('profiles').insert({
      id: created.user.id, name: parent_name, email, role: 'parent',
      student_id: res.found[0].id, school_id: school.id,
    })
    if (profErr) {
      await admin.auth.admin.deleteUser(created.user.id)
      console.error('parent-register profile error:', profErr.message)
      return fail('server', 500)
    }
  }

  const { error: linkErr } = await admin.from('students')
    .update({ parent_name, parent_phone, parent_email: email, parent_invite_status: 'accepted' })
    .in('id', res.found.map(f => f.id))
  if (linkErr) {
    console.error('parent-register link error:', linkErr.message)
    return fail('server', 500)
  }

  return NextResponse.json({ success: true, existing: !!existing })
}