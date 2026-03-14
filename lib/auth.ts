// src/lib/auth.ts
// Server-side auth helpers — use only in Server Components / layouts / API routes

import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'
import type { Role, ProfileWithSchool } from '@/types'

// ─── Get current authenticated user's full profile ────────
export async function getProfile(): Promise<ProfileWithSchool | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*, schools(*)')
    .eq('id', user.id)
    .single()

  if (error || !data) return null

  return data as ProfileWithSchool
}

// ─── Require auth — redirect to login if not signed in ────
// Optionally restrict to specific roles
export async function requireAuth(allowedRoles?: Role[]): Promise<ProfileWithSchool> {
  const profile = await getProfile()

  if (!profile) {
    redirect('/auth/login')
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Wrong role — send to the correct home
    if (profile.role === 'teacher') redirect('/teacher')
    else redirect('/dashboard')
  }

  return profile
}