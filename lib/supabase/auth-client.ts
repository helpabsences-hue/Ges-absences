// lib/supabase/auth-client.ts
// Use this ONLY in auth pages (login, forgot-password, reset-password)
// Uses @supabase/supabase-js directly — no SSR wrapper
// This ensures code_verifier is stored in localStorage correctly for PKCE

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAuthClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage:          typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey:       'sb-auth-token',
        autoRefreshToken: true,
        persistSession:   true,
        detectSessionInUrl: true,
      }
    }
  )
}
