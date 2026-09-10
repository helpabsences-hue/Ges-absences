// // // src/stores/useStudentStore.ts
// // import { create } from 'zustand'
// // import { createClient } from '@/lib/supabase/client'
// // import { useAuthStore } from './useAuthStore'
// // import type { StudentWithGroup, AddStudentPayload } from '@/types'

// // interface StudentState {
// //   students:      StudentWithGroup[]
// //   loading:       boolean
// //   error:         string | null

// //   fetchStudents: () => Promise<void>
// //   addStudent:    (data: AddStudentPayload) => Promise<string | null>
// //   updateStudent: (id: string, data: Partial<AddStudentPayload>) => Promise<void>
// //   deleteStudent: (id: string) => Promise<void>
// // }

// // export const useStudentStore = create<StudentState>((set, get) => ({
// //   students: [],
// //   loading:  false,
// //   error:    null,

// //   // ── Fetch ──────────────────────────────────────────────
// //   fetchStudents: async () => {
// //     set({ loading: true, error: null })
// //     const supabase = createClient()

// //     const { data, error } = await supabase
// //       .from('students')
// //       .select('*, groups(id, name, year)')
// //       .order('name', { ascending: true })

// //     if (error) {
// //       set({ error: error.message, loading: false })
// //       return
// //     }
// //     set({ students: data as StudentWithGroup[], loading: false })
// //   },

// //   // ── Add ────────────────────────────────────────────────
// //   addStudent: async (data) => {
// //     const school_id = useAuthStore.getState().profile?.school_id
// //     if (!school_id) return null

// //     const supabase = createClient()
// //     const { data: inserted, error } = await supabase
// //       .from('students')
// //       .insert({ ...data, school_id })
// //       .select()
// //       .single()

// //     if (error) {
// //       set({ error: error.message })
// //       return null
// //     }

// //     await get().fetchStudents()
// //     return inserted.id
// //   },

// //   // ── Update ─────────────────────────────────────────────
// //   updateStudent: async (id, data) => {
// //     const supabase = createClient()
// //     const { error } = await supabase
// //       .from('students')
// //       .update(data)
// //       .eq('id', id)

// //     if (error) { set({ error: error.message }); return }
// //     await get().fetchStudents()
// //   },

// //   // ── Delete ─────────────────────────────────────────────
// //   deleteStudent: async (id) => {
// //     const supabase = createClient()
// //     const { error } = await supabase
// //       .from('students')
// //       .delete()
// //       .eq('id', id)

// //     if (error) { set({ error: error.message }); return }
// //     set((s) => ({ students: s.students.filter((st) => st.id !== id) }))
// //   },
// // }))

// // src/stores/useStudentStore.ts
// import { create } from 'zustand'
// import { createClient } from '@/lib/supabase/client'
// import { useAuthStore } from './useAuthStore'
// import type { StudentWithGroup, AddStudentPayload } from '@/types'

// interface StudentState {
//   students:      StudentWithGroup[]
//   loading:       boolean
//   error:         string | null

//   fetchStudents: () => Promise<void>
//   addStudent:    (data: AddStudentPayload) => Promise<string | null>
//   updateStudent: (id: string, data: Partial<AddStudentPayload>) => Promise<void>
//   deleteStudent: (id: string) => Promise<void>
// }

// export const useStudentStore = create<StudentState>((set, get) => ({
//   students: [],
//   loading:  false,
//   error:    null,

//   // ── Fetch ──────────────────────────────────────────────
//   fetchStudents: async () => {
//     set({ loading: true, error: null })
//     const supabase  = createClient()
//     const school_id = useAuthStore.getState().profile?.school_id
//     if (!school_id) { set({ loading: false }); return }

//     const { data, error } = await supabase
//       .from('students')
//       .select('*, groups(id, name, year)')
//       .eq('school_id', school_id)
//       .order('name', { ascending: true })

//     if (error) {
//       set({ error: error.message, loading: false })
//       return
//     }
//     set({ students: data as StudentWithGroup[], loading: false })
//   },

//   // ── Add ────────────────────────────────────────────────
//   addStudent: async (data) => {
//     const school_id = useAuthStore.getState().profile?.school_id
//     if (!school_id) return null

//     const supabase = createClient()
//     const { data: inserted, error } = await supabase
//       .from('students')
//       .insert({ ...data, school_id })
//       .select()
//       .single()

//     if (error) {
//       set({ error: error.message })
//       return null
//     }

//     await get().fetchStudents()
//     return inserted.id
//   },

//   // ── Update ─────────────────────────────────────────────
//   updateStudent: async (id, data) => {
//     const supabase = createClient()
//     const { error } = await supabase
//       .from('students')
//       .update(data)
//       .eq('id', id)

//     if (error) { set({ error: error.message }); return }
//     await get().fetchStudents()
//   },

//   // ── Delete ─────────────────────────────────────────────
//   deleteStudent: async (id) => {
//     const supabase = createClient()
//     const { error } = await supabase
//       .from('students')
//       .delete()
//       .eq('id', id)

//     if (error) { set({ error: error.message }); return }
//     set((s) => ({ students: s.students.filter((st) => st.id !== id) }))
//   },
// }))

// src/stores/useStudentStore.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'
import type { StudentWithGroup, AddStudentPayload } from '@/types'

interface StudentState {
  students:      StudentWithGroup[]
  loading:       boolean
  error:         string | null

  fetchStudents: () => Promise<void>
  addStudent:    (data: AddStudentPayload) => Promise<string | null>
  updateStudent: (id: string, data: Partial<AddStudentPayload>) => Promise<void>
  deleteStudent: (id: string) => Promise<void>
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  loading:  false,
  error:    null,

  // ── Fetch ──────────────────────────────────────────────
  fetchStudents: async () => {
    set({ loading: true, error: null })
    const supabase  = createClient()
    const school_id = useAuthStore.getState().profile?.school_id
    if (!school_id) { set({ loading: false }); return }

    const { data, error } = await supabase
      .from('students')
      .select('*, groups(id, name, year)')
      .eq('school_id', school_id)
      .order('name', { ascending: true })

    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    set({ students: data as StudentWithGroup[], loading: false })
  },

  // ── Add ────────────────────────────────────────────────
  addStudent: async (data) => {
    const school_id = useAuthStore.getState().profile?.school_id
    if (!school_id) return null

    const supabase = createClient()
    const { data: inserted, error } = await supabase
      .from('students')
      .insert({ ...data, school_id })
      .select()
      .single()

    if (error) {
      set({ error: error.message })
      return null
    }

    await get().fetchStudents()
    return inserted.id
  },

  // ── Update ─────────────────────────────────────────────
  updateStudent: async (id, data) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('students')
      .update(data)
      .eq('id', id)

    if (error) { set({ error: error.message }); return }
    await get().fetchStudents()
  },

  // ── Delete ─────────────────────────────────────────────
  deleteStudent: async (id) => {
    const supabase = createClient()

    // 1. Get student's parent_email before deleting
    const { data: student } = await supabase
      .from('students')
      .select('parent_email')
      .eq('id', id)
      .maybeSingle()

    // 2. Delete student from DB
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) { set({ error: error.message }); return }

    // 3. Delete parent from auth if they have no other children
    if (student?.parent_email) {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('parent_email', student.parent_email)

      if (!count || count === 0) {
        const { data: parentProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', student.parent_email)
          .eq('role', 'parent')
          .maybeSingle()

        if (parentProfile?.id) {
          await fetch('/api/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parentProfile.id })
          })
        }
      }
    }

    set((s) => ({ students: s.students.filter((st) => st.id !== id) }))
  },
}))