import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // ── Always public ─────────────────────────────────────
  const isPublic =
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/')  ||
    pathname.startsWith('/blocked') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')

  if (isPublic) return supabaseResponse

  // ── Not logged in → login ─────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // ── Get profile once ──────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // ── platform_admin → /super-admin only ───────────────
  if (role === 'platform_admin') {
    if (!pathname.startsWith('/super-admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/super-admin'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ── Block /super-admin for everyone else ──────────────
  if (pathname.startsWith('/super-admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Root / login → correct home ───────────────────────
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    if (role === 'teacher')      url.pathname = '/teacher'
    else if (role === 'parent')  url.pathname = '/parent'
    else                         url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Role-based route guards ───────────────────────────
  if (role === 'teacher' && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/teacher'
    return NextResponse.redirect(url)
  }

  if (role === 'parent' && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/parent'
    return NextResponse.redirect(url)
  }

  if (role !== 'teacher' && pathname.startsWith('/teacher')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (role !== 'parent' && pathname.startsWith('/parent')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Trial check — only for admin roles on /dashboard ──
  if ((role === 'super_admin' || role === 'admin') &&
       pathname.startsWith('/dashboard') &&
       profile?.school_id) {

    const { data: school } = await supabase
      .from('schools')
      .select('status, trial_ends_at, paid_until')
      .eq('id', profile.school_id)
      .single()

    if (school) {
      const now       = new Date()
      const trialEnd  = school.trial_ends_at ? new Date(school.trial_ends_at) : null
      const paidUntil = school.paid_until    ? new Date(school.paid_until)    : null

      const isExpired =
        (school.status === 'trial'    && trialEnd  && trialEnd  < now) ||
        (school.status === 'active'   && paidUntil && paidUntil < now) ||
        school.status === 'inactive'

      if (isExpired) {
        const url = request.nextUrl.clone()
        url.pathname = '/blocked'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}