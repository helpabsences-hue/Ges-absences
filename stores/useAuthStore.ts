// src/stores/useAuthStore.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { ProfileWithSchool } from '@/types'

interface AuthState {
  profile: ProfileWithSchool | null
  loading: boolean
  // actions
  fetchProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  loading: true,

  fetchProfile: async () => {
    set({ loading: true })
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ profile: null, loading: false })
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, schools(*)')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      set({ profile: null, loading: false })
      return
    }

    set({ profile: data as ProfileWithSchool, loading: false })
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ profile: null })
  },
}))