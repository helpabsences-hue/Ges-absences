// stores/useInvitationStore.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Invitation, InvitePayload } from '@/types'

interface InvitationState {
  invitations: Invitation[]
  loading:     boolean
  sending:     boolean
  error:       string | null
  success:     string | null
  inviteUrl:   string | null   // set when email fails but row was created

  fetchInvitations:  () => Promise<void>
  sendInvitation:    (payload: InvitePayload) => Promise<boolean>
  resendInvitation:  (id: string) => Promise<void>
  deleteInvitation:  (id: string) => Promise<void>
  clearMessages:     () => void
}

export const useInvitationStore = create<InvitationState>((set, get) => ({
  invitations: [],
  loading:     false,
  sending:     false,
  error:       null,
  success:     null,
  inviteUrl:   null,

  fetchInvitations: async () => {
    set({ loading: true, error: null })
    const supabase = createClient()
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message, loading: false }); return }
    set({ invitations: data as Invitation[], loading: false })
  },

  sendInvitation: async (payload) => {
    set({ sending: true, error: null, success: null, inviteUrl: null })

    const res  = await fetch('/api/invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      set({ error: data.error ?? 'Failed to send invitation.', sending: false })
      return false
    }

    // Email sent fine
    if (!data.emailError) {
      set({ success: `Invitation sent to ${payload.email}`, sending: false })
    } else {
      // Invitation created but email failed — show the invite URL so admin can share manually
      set({
        success:   `Invitation created for ${payload.email} (email failed — share the link below)`,
        inviteUrl: data.inviteUrl,
        sending:   false,
      })
      console.warn('Email failed:', data.emailError)
    }

    await get().fetchInvitations()
    return true
  },

  resendInvitation: async (id) => {
    set({ sending: true, error: null, success: null, inviteUrl: null })
    const supabase = createClient()

    const invitation = get().invitations.find((i) => i.id === id)
    if (!invitation) { set({ sending: false, error: 'Invitation not found.' }); return }

    await supabase.from('invitations').delete().eq('id', id)

    const res  = await fetch('/api/invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: invitation.email, role: invitation.role }),
    })
    const data = await res.json()

    if (!res.ok) {
      set({ error: data.error ?? 'Failed to resend invitation.', sending: false })
      return
    }

    if (!data.emailError) {
      set({ success: `Invitation resent to ${invitation.email}`, sending: false })
    } else {
      set({
        success:   `Invitation created (email failed — share the link below)`,
        inviteUrl: data.inviteUrl,
        sending:   false,
      })
    }

    await get().fetchInvitations()
  },

  deleteInvitation: async (id) => {
    const supabase = createClient()
    await supabase.from('invitations').delete().eq('id', id)
    set((state) => ({ invitations: state.invitations.filter((i) => i.id !== id) }))
  },

  clearMessages: () => set({ error: null, success: null, inviteUrl: null }),
}))