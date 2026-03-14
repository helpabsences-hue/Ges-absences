// src/stores/useGroupStore.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'
import type { Field, GroupWithField, AddGroupPayload, AddFieldPayload } from '@/types'

interface GroupState {
  groups:       GroupWithField[]
  fields:       Field[]
  loading:      boolean
  error:        string | null

  fetchGroups:  () => Promise<void>
  fetchFields:  () => Promise<void>

  addGroup:     (data: AddGroupPayload) => Promise<string | null>
  updateGroup:  (id: string, data: Partial<AddGroupPayload>) => Promise<void>
  deleteGroup:  (id: string) => Promise<void>

  addField:     (data: AddFieldPayload) => Promise<string | null>
  updateField:  (id: string, data: Partial<AddFieldPayload>) => Promise<void>
  deleteField:  (id: string) => Promise<void>
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups:  [],
  fields:  [],
  loading: false,
  error:   null,

  // ── Fetch ──────────────────────────────────────────────
  fetchGroups: async () => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const { data, error } = await supabase
      .from('groups')
      .select('*, fields(*)')
      .order('year', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ groups: data as GroupWithField[], loading: false })
  },

  fetchFields: async () => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ fields: data as Field[], loading: false })
  },

  // ── Groups CRUD ────────────────────────────────────────
  addGroup: async (data) => {
    const school_id = useAuthStore.getState().profile?.school_id
    if (!school_id) return null

    const supabase = createClient()
    const { data: inserted, error } = await supabase
      .from('groups')
      .insert({ ...data, school_id })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    await get().fetchGroups()
    return inserted.id
  },

  updateGroup: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('groups')
      .update(data)
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    await get().fetchGroups()
  },

  deleteGroup: async (id) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) }))
  },

  // ── Fields CRUD ────────────────────────────────────────
  addField: async (data) => {
    const school_id = useAuthStore.getState().profile?.school_id
    if (!school_id) return null

    const supabase = createClient()
    const { data: inserted, error } = await supabase
      .from('fields')
      .insert({ ...data, school_id })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    await get().fetchFields()
    return inserted.id
  },

  updateField: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('fields')
      .update(data)
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    await get().fetchFields()
  },

  deleteField: async (id) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('fields')
      .delete()
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    set((s) => ({ fields: s.fields.filter((f) => f.id !== id) }))
  },
}))