// src/middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface CookieToSet {
  name: string
  value: string
  options?: CookieOptions
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: CookieToSet[]) {
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

  // ── Public routes ────────────────────────────────────────
  const isAuthRoute =
    pathname.startsWith('/auth/login')           ||
    pathname.startsWith('/auth/register')        ||
    pathname.startsWith('/auth/invite')          ||
    pathname.startsWith('/auth/forgot-password') ||
    pathname.startsWith('/auth/reset-password')

  const isApiRoute  = pathname.startsWith('/api/')
  const isBlocked   = pathname.startsWith('/blocked')

  // Not logged in → login
  if (!user && !isAuthRoute && !isApiRoute && !isBlocked) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, school_id')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // ── platform_admin → only /super-admin ────────────────
    if (role === 'platform_admin') {
      if (!pathname.startsWith('/super-admin') && !isApiRoute && !isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/super-admin'
        return NextResponse.redirect(url)
      }
      return supabaseResponse
    }

    // ── Block /super-admin for non platform_admin ─────────
    if (pathname.startsWith('/super-admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // ── Trial check — only for super_admin and admin ──────
    if ((role === 'super_admin' || role === 'admin') &&
        !isAuthRoute && !isApiRoute && !isBlocked &&
        !pathname.startsWith('/parent') &&
        !pathname.startsWith('/teacher') &&
        pathname !== '/') {

      if (profile?.school_id) {
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
            (school.status === 'trial'  && trialEnd  && trialEnd  < now) ||
            (school.status === 'active' && paidUntil && paidUntil < now) ||
            school.status === 'inactive'

          if (isExpired) {
            const url = request.nextUrl.clone()
            url.pathname = '/blocked'
            return NextResponse.redirect(url)
          }
        }
      }
    }

    // ── Root or login → redirect to correct home ──────────
    if (pathname === '/' || pathname === '/auth/login') {
      const url = request.nextUrl.clone()
      if (role === 'teacher') url.pathname = '/teacher'
      else if (role === 'parent') url.pathname = '/parent'
      else url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // ── Teacher trying /dashboard → /teacher ──────────────
    if (role === 'teacher' && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/teacher'
      return NextResponse.redirect(url)
    }

    // ── Parent trying /dashboard → /parent ───────────────
    if (role === 'parent' && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/parent'
      return NextResponse.redirect(url)
    }

    // ── Non-teacher trying /teacher → /dashboard ─────────
    if (role !== 'teacher' && pathname.startsWith('/teacher')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // ── Non-parent trying /parent → /dashboard ────────────
    if (role !== 'parent' && pathname.startsWith('/parent')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}