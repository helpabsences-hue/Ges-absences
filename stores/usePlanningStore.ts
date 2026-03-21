// src/stores/usePlanningStore.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'
import type { TeacherPlanningFull, Profile, Group, Course, AddPlanningPayload } from '@/types'

interface PlanningState {
  slots:        TeacherPlanningFull[]
  teachers:     Pick<Profile, 'id' | 'name' | 'email'>[]
  groups:       Pick<Group,   'id' | 'name' | 'year'>[]
  courses:      Pick<Course,  'id' | 'name'>[]
  loading:      boolean
  error:        string | null

  fetchSlots:    () => Promise<void>
  fetchDropdowns: () => Promise<void>   // teachers + groups + courses in one call
  addSlot:       (data: AddPlanningPayload) => Promise<string | null>
  updateSlot:    (id: string, data: AddPlanningPayload) => Promise<boolean>
  deleteSlot:    (id: string) => Promise<void>
}

export const usePlanningStore = create<PlanningState>((set, get) => ({
  slots:    [],
  teachers: [],
  groups:   [],
  courses:  [],
  loading:  false,
  error:    null,

  // ── Fetch planning slots (with all joins) ──────────────
  fetchSlots: async () => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const { data, error } = await supabase
      .from('teacher_planning')
      .select(`
        *,
        profiles ( id, name, email ),
        groups   ( id, name, year ),
        courses  ( id, name )
      `)
      .order('day')
      .order('start_time')

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    set({ slots: data as TeacherPlanningFull[], loading: false })
  },

  // ── Fetch dropdown options for the form ───────────────
  fetchDropdowns: async () => {
    const supabase = createClient()

    const [
      { data: teachers },
      { data: groups },
      { data: courses },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'teacher')
        .order('name'),
      supabase
        .from('groups')
        .select('id, name, year')
        .order('year')
        .order('name'),
      supabase
        .from('courses')
        .select('id, name')
        .order('name'),
    ])

    set({
      teachers: teachers ?? [],
      groups:   groups   ?? [],
      courses:  courses  ?? [],
    })
  },

  // ── Add slot ──────────────────────────────────────────
  addSlot: async (data) => {
    const school_id = useAuthStore.getState().profile?.school_id
    if (!school_id) return null

    // Validate no overlap for same teacher + day + time range
    const existing = get().slots.filter(
      (s) =>
        s.teacher_id === data.teacher_id &&
        s.day        === data.day
    )

    const newStart = data.start_time
    const newEnd   = data.end_time

    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const ns = toMin(newStart), ne = toMin(newEnd)
    const hasOverlap = existing.some((s) => {
      // Skip if editing same slot
      const ss = toMin(s.start_time.slice(0,5)), se = toMin(s.end_time.slice(0,5))
      // True overlap: strictly inside — touching is NOT overlap
      return ns < se && ne > ss
    })

    if (hasOverlap) {
      set({ error: 'This teacher already has a class during that time slot.' })
      return null
    }

    set({ error: null })
    const supabase = createClient()

    const { data: inserted, error } = await supabase
      .from('teacher_planning')
      .insert({
        teacher_id:   data.teacher_id,
        group_id:     data.group_id,
        course_id:    data.course_id,
        day:          data.day,
        start_time:   data.start_time,
        end_time:     data.end_time,
        session_date: data.session_date || null,  // null = weekly recurring
        school_id,
      })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    await get().fetchSlots()
    return inserted.id
  },

  // ── Update slot ──────────────────────────────────────
  updateSlot: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('teacher_planning')
      .update({
        teacher_id:   data.teacher_id,
        group_id:     data.group_id,
        course_id:    data.course_id,
        day:          data.day,
        start_time:   data.start_time,
        end_time:     data.end_time,
        session_date: data.session_date || null,
      })
      .eq('id', id)

    if (error) { set({ error: error.message }); return false }
    await get().fetchSlots()
    return true
  },

  // ── Delete slot ───────────────────────────────────────
  deleteSlot: async (id) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('teacher_planning')
      .delete()
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    set((s) => ({ slots: s.slots.filter((sl) => sl.id !== id) }))
  },
}))
