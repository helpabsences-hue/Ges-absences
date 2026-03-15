// // src/middleware.ts

// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'

// export async function middleware(request: NextRequest) {
//   let supabaseResponse = NextResponse.next({ request })

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll()
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value }) =>
//             request.cookies.set(name, value)
//           )
//           supabaseResponse = NextResponse.next({ request })
//           cookiesToSet.forEach(({ name, value, options }) =>
//             supabaseResponse.cookies.set(name, value, options)
//           )
//         },
//       },
//     }
//   )

//   // Refresh session — must be called before any redirect
//   const {
//     data: { user },
//   } = await supabase.auth.getUser()

//   const { pathname } = request.nextUrl

//   // ── Public routes (no auth needed) ──────────────────────
//   const isAuthRoute =
//     pathname.startsWith('/auth/login') ||
//     pathname.startsWith('/auth/register') ||
//     pathname.startsWith('/auth/invite')

//   const isApiRoute = pathname.startsWith('/api/')

//   // Not logged in and trying to access a protected route
//   if (!user && !isAuthRoute && !isApiRoute) {
//     const url = request.nextUrl.clone()
//     url.pathname = '/auth/login'
//     return NextResponse.redirect(url)
//   }

//   // Logged in but hitting root or login page → redirect to correct home
//   if (user && (pathname === '/' || pathname === '/auth/login')) {
//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('role')
//       .eq('id', user.id)
//       .single()

//     const url = request.nextUrl.clone()
//     url.pathname = profile?.role === 'teacher' ? '/teacher' : '/dashboard'
//     return NextResponse.redirect(url)
//   }

//   // Logged-in teacher trying to access /dashboard → send to /teacher
//   if (user && pathname.startsWith('/dashboard')) {
//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('role')
//       .eq('id', user.id)
//       .single()

//     if (profile?.role === 'teacher') {
//       const url = request.nextUrl.clone()
//       url.pathname = '/teacher'
//       return NextResponse.redirect(url)
//     }
//   }

//   // Logged-in admin/super_admin trying to access /teacher → send to /dashboard
//   if (user && pathname.startsWith('/teacher')) {
//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('role')
//       .eq('id', user.id)
//       .single()

//     if (profile?.role !== 'teacher') {
//       const url = request.nextUrl.clone()
//       url.pathname = '/dashboard'
//       return NextResponse.redirect(url)
//     }
//   }

//   return supabaseResponse
// }

// export const config = {
//   matcher: [
//     /*
//      * Match all routes except:
//      * - _next/static  (static files)
//      * - _next/image   (image optimization)
//      * - favicon.ico
//      */
//     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
//   ],
// }

// src/middleware.ts

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must be called before any redirect
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── Public routes (no auth needed) ──────────────────────
  const isAuthRoute =
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register') ||
    pathname.startsWith('/auth/invite') ||
    pathname.startsWith('/auth/forgot-password') ||
    pathname.startsWith('/auth/reset-password') ||
    pathname.startsWith('/auth/callback')

  const isApiRoute = pathname.startsWith('/api/')

  // Not logged in and trying to access a protected route
  if (!user && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Logged in but hitting root or login page → redirect to correct home
  if (user && (pathname === '/' || pathname === '/auth/login')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'teacher' ? '/teacher' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Logged-in teacher trying to access /dashboard → send to /teacher
  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'teacher') {
      const url = request.nextUrl.clone()
      url.pathname = '/teacher'
      return NextResponse.redirect(url)
    }
  }

  // Logged-in admin/super_admin trying to access /teacher → send to /dashboard
  if (user && pathname.startsWith('/teacher')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'teacher') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
