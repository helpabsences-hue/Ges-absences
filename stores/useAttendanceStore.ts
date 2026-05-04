// src/stores/useAttendanceStore.ts
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from './useAuthStore'
import type {
  TeacherPlanningFull,
  ClassSession,
  Student,
  AttendanceStatus,
  Day,
} from '@/types'

// Per-student record held in the modal
export interface AttendanceEntry {
  student_id: string
  status:     AttendanceStatus
  reason:     string
}

interface AttendanceState {
  // Schedule
  todaySlots:    TeacherPlanningFull[]
  allSlots:      TeacherPlanningFull[]
  scheduleLoading: boolean

  // Active session
  activeSession:   ClassSession | null
  activePlanning:  TeacherPlanningFull | null
  students:        Student[]
  records:         Record<string, AttendanceEntry>  // keyed by student_id
  sessionLoading:  boolean
  saving:          boolean
  saved:           boolean

  // Actions
  fetchSchedule:        () => Promise<void>
  subscribeToSchedule:  (uid: string) => () => void  // returns unsubscribe fn
  startSession:    (slot: TeacherPlanningFull) => Promise<void>
  setStatus:       (studentId: string, status: AttendanceStatus) => void
  setReason:       (studentId: string, reason: string) => void
  setAllPresent:   () => void
  setAllAbsent:    () => void
  saveAttendance:  () => Promise<void>
  closeSession:    () => void
}

const TODAY_NAME = (): Day => {
  const names: Day[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as any
  return names[new Date().getDay()] as Day
}

const TODAY_DATE = () => new Date().toISOString().split('T')[0]

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  todaySlots:      [],
  allSlots:        [],
  scheduleLoading: false,

  activeSession:   null,
  activePlanning:  null,
  students:        [],
  records:         {},
  sessionLoading:  false,
  saving:          false,
  saved:           false,

  // ── Realtime subscription for schedule changes ────────
  subscribeToSchedule: (uid: string) => {
    const supabase = createClient()
    const channel = supabase
      .channel(`teacher_planning_${uid}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'teacher_planning',
        filter: `teacher_id=eq.${uid}`,
      }, () => {
        get().fetchSchedule()
      })
      .subscribe()

    // Return unsubscribe function
    return () => { supabase.removeChannel(channel) }
  },

  // ── Load teacher's full schedule ───────────────────────
  fetchSchedule: async () => {
    set({ scheduleLoading: true })
    const supabase = createClient()
    const uid = useAuthStore.getState().profile?.id
    if (!uid) { set({ scheduleLoading: false }); return }

    const { data, error } = await supabase
      .from('teacher_planning')
      .select(`
        *,
        profiles ( id, name, email ),
        groups   ( id, name, year ),
        courses  ( id, name )
      `)
      .eq('teacher_id', uid)
      .order('day')
      .order('start_time')

    if (error || !data) { set({ scheduleLoading: false }); return }

    const todayDate = TODAY_DATE()
    const todayName = TODAY_NAME()
    const all = data as TeacherPlanningFull[]

    // Today's slots: weekly slots for today's day name OR special sessions for today's date
    const today = all.filter((s: any) => {
      if (s.session_date) return s.session_date === todayDate  // special session
      return s.day === todayName                                // weekly recurring
    })

    set({ allSlots: all, todaySlots: today, scheduleLoading: false })
  },

  // ── Start (or resume) a class session ─────────────────
  startSession: async (slot) => {
    set({ sessionLoading: true, saved: false })
    const supabase = createClient()
    const date = TODAY_DATE()

    // 1. Try to find existing session first (resume / modify flow)
    let sessionData: any = null

    const { data: existing } = await supabase
      .from('class_sessions')
      .select()
      .eq('planning_id', slot.id)
      .eq('session_date', date)
      .single()

    if (existing) {
      // Session already exists — resume or modify it
      sessionData = existing
    } else {
      // Create new session
      const { data: created, error: createError } = await supabase
        .from('class_sessions')
        .insert({ planning_id: slot.id, session_date: date })
        .select()
        .single()

      if (createError || !created) {
        console.error('Failed to create session:', createError?.message)
        set({ sessionLoading: false })
        return
      }
      sessionData = created
    }

    // 2. Load students in this group
    const { data: students } = await supabase
      .from('students')
      .select('id, name, massar_code, group_id, school_id')
      .eq('group_id', slot.group_id)
      .order('name')

    const studs = (students ?? []) as Student[]

    // 3. Load any existing attendance for this session
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('student_id, status, reason')
      .eq('session_id', sessionData.id)

    // Build records map — default to 'present' for new sessions
    const existingMap: Record<string, AttendanceEntry> = {}
    ;(existingAttendance ?? []).forEach((a: any) => {
      existingMap[a.student_id] = {
        student_id: a.student_id,
        status:     a.status,
        reason:     a.reason ?? '',
      }
    })

    const records: Record<string, AttendanceEntry> = {}
    studs.forEach((s) => {
      records[s.id] = existingMap[s.id] ?? {
        student_id: s.id,
        status:     'present',
        reason:     '',
      }
    })

    set({
      activeSession:  sessionData as ClassSession,
      activePlanning: slot,
      students:       studs,
      records,
      sessionLoading: false,
    })
  },

  // ── Per-student mutations ──────────────────────────────
  setStatus: (studentId, status) =>
    set((s) => ({
      saved: false,
      records: {
        ...s.records,
        [studentId]: { ...s.records[studentId], status },
      },
    })),

  setReason: (studentId, reason) =>
    set((s) => ({
      records: {
        ...s.records,
        [studentId]: { ...s.records[studentId], reason },
      },
    })),

  setAllPresent: () =>
    set((s) => {
      const records = { ...s.records }
      Object.keys(records).forEach((id) => {
        records[id] = { ...records[id], status: 'present', reason: '' }
      })
      return { records, saved: false }
    }),

  setAllAbsent: () =>
    set((s) => {
      const records = { ...s.records }
      Object.keys(records).forEach((id) => {
        records[id] = { ...records[id], status: 'absent', reason: '' }
      })
      return { records, saved: false }
    }),

  // ── Save all records to Supabase ──────────────────────
  saveAttendance: async () => {
    const { activeSession, records } = get()
    if (!activeSession) return

    set({ saving: true })
    const supabase = createClient()

    const rows = Object.values(records).map((r) => ({
      session_id: activeSession.id,
      student_id: r.student_id,
      status:     r.status,
      reason:     r.reason || null,
    }))

    // Delete existing records first then insert fresh — avoids upsert conflicts
    await supabase
      .from('attendance')
      .delete()
      .eq('session_id', activeSession.id)

    const { error } = await supabase
      .from('attendance')
      .insert(rows)

    if (error) {
      console.error('Save attendance error:', error.message)
    }
    set({ saving: false, saved: !error })
  },

  // ── Close modal ───────────────────────────────────────
  closeSession: () =>
    set({
      activeSession:  null,
      activePlanning: null,
      students:       [],
      records:        {},
      saved:          false,
    }),
}))
