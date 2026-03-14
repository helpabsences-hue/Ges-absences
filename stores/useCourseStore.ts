// src/stores/useCourseStore.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'
import type { Course, AddCoursePayload } from '@/types'

interface CourseState {
  courses:      Course[]
  loading:      boolean
  error:        string | null

  fetchCourses: () => Promise<void>
  addCourse:    (data: AddCoursePayload) => Promise<string | null>
  updateCourse: (id: string, data: Partial<AddCoursePayload>) => Promise<void>
  deleteCourse: (id: string) => Promise<void>
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  loading: false,
  error:   null,

  // ── Fetch ──────────────────────────────────────────────
  fetchCourses: async () => {
    set({ loading: true, error: null })
    const supabase = createClient()

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ courses: data as Course[], loading: false })
  },

  // ── Add ────────────────────────────────────────────────
  addCourse: async (data) => {
    const school_id = useAuthStore.getState().profile?.school_id
    if (!school_id) return null

    const supabase = createClient()
    const { data: inserted, error } = await supabase
      .from('courses')
      .insert({ ...data, school_id })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    await get().fetchCourses()
    return inserted.id
  },

  // ── Update ─────────────────────────────────────────────
  updateCourse: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('courses')
      .update(data)
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    await get().fetchCourses()
  },

  // ── Delete ─────────────────────────────────────────────
  deleteCourse: async (id) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    set((s) => ({ courses: s.courses.filter((c) => c.id !== id) }))
  },
}))