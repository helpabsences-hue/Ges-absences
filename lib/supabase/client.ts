// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',        // PKCE is more secure — code can only be exchanged once
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      }
    }
  )
}

export const supabase = createClient()
