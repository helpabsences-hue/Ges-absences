// app/auth/callback/route.ts
// Supabase redirects here after email confirmation / password reset
// This exchanges the code for a session then redirects to the right page

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code  = searchParams.get('code')
  const type  = searchParams.get('type')   // 'recovery' for password reset
  const next  = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Password reset → go to reset page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      // Other (invite, email confirm) → go to dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong → back to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=invalid_link`)
}
