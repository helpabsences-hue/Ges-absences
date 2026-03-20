// app/auth/callback/route.ts
export const dynamic = 'force-dynamic'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code      = searchParams.get('code')
  const type      = searchParams.get('type')       // our custom param
  const tokenHash = searchParams.get('token_hash') // Supabase native param
  const next      = searchParams.get('next') ?? '/dashboard'

  console.log('Callback params:', { code: !!code, type, tokenHash: !!tokenHash })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  // ── Case 1: PKCE flow — has a code param ──────────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('exchangeCodeForSession:', { user: data?.user?.email, error: error?.message })

    if (!error && data.session) {
      // Detect recovery: either explicit type param OR user has recovery_sent_at set
      const isRecovery = type === 'recovery' || !!data.session.user?.recovery_sent_at

      if (isRecovery) {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('Code exchange failed:', error?.message)
  }

  // ── Case 2: token_hash flow (older Supabase email format) ──
  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })
    console.log('verifyOtp:', { user: data?.user?.email, error: error?.message })

    if (!error && data.session) {
      return NextResponse.redirect(`${origin}/auth/reset-password`)
    }
    console.error('Token hash verification failed:', error?.message)
  }

  // ── Fallback: redirect to forgot-password ─────────────
  console.error('Callback failed — no valid code or token_hash')
  return NextResponse.redirect(`${origin}/auth/forgot-password?error=link_expired`)
}
