// src/types/index.ts

export type Role = 'super_admin' | 'admin' | 'teacher'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'unmarked'
export type InvitationStatus = 'pending' | 'accepted'
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'

// ─── School ───────────────────────────────────────────────
export interface School {
  id: string
  name: string
  city: string
  country: string
  created_at: string
}

// ─── Profile (replaces user + admin + teacher tables) ─────
export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  school_id: string
  created_at: string
}

// Profile with school joined (used in auth store)
export interface ProfileWithSchool extends Profile {
  schools: School
}

// ─── Field ────────────────────────────────────────────────
export interface Field {
  id: string
  name: string
  number_groups: number | null
  school_id: string
}

// ─── Group ────────────────────────────────────────────────
export interface Group {
  id: string
  name: string
  year: number
  field_id: string | null
  number_student: number | null
  school_id: string
}

export interface GroupWithField extends Group {
  fields: Field | null
}

// ─── Student ──────────────────────────────────────────────
export interface Student {
  id: string
  name: string
  massar_code: string
  group_id: string | null
  school_id: string
}

export interface StudentWithGroup extends Student {
  groups: Group | null
}

// ─── Course ───────────────────────────────────────────────
export interface Course {
  id: string
  name: string
  hour: string | null   // time string e.g. "02:00:00"
  school_id: string
}

// ─── Teacher ↔ Course assignment ──────────────────────────
export interface TeacherCourse {
  teacher_id: string
  course_id: string
}

// ─── Teacher ↔ Group assignment ───────────────────────────
export interface TeacherGroup {
  teacher_id: string
  group_id: string
}

// ─── Teacher Planning ─────────────────────────────────────
export interface TeacherPlanning {
  id: string
  teacher_id: string
  group_id: string
  course_id: string
  day: Day
  start_time: string   // "08:00:00"
  end_time: string     // "09:00:00"
  school_id: string
}

export interface TeacherPlanningFull extends TeacherPlanning {
  profiles: Pick<Profile, 'id' | 'name' | 'email'>
  groups: Pick<Group, 'id' | 'name' | 'year'>
  courses: Pick<Course, 'id' | 'name'>
}

// ─── Class Session ────────────────────────────────────────
export interface ClassSession {
  id: string
  planning_id: string
  session_date: string  // "2025-01-15"
  started_at: string
}

export interface ClassSessionWithPlanning extends ClassSession {
  teacher_planning: TeacherPlanningFull
}

// ─── Attendance ───────────────────────────────────────────
export interface Attendance {
  id: string
  session_id: string
  student_id: string
  status: AttendanceStatus
  reason: string | null
  created_at: string
}

export interface AttendanceWithStudent extends Attendance {
  students: Pick<Student, 'id' | 'name' | 'massar_code'>
}

// ─── Invitation ───────────────────────────────────────────
export interface Invitation {
  id: string
  email: string
  role: 'admin' | 'teacher'
  school_id: string
  token: string
  status: InvitationStatus
  created_at: string
}

// ─── Form payloads ────────────────────────────────────────
export interface RegisterPayload {
  schoolName: string
  city: string
  ownerName: string
  email: string
  password: string
}

export interface InvitePayload {
  email: string
  role: 'admin' | 'teacher'
}

export interface AcceptInvitePayload {
  token: string
  name: string
  password: string
}

export interface AddStudentPayload {
  name: string
  massar_code: string
  group_id: string
}

export interface AddGroupPayload {
  name: string
  year: number
  field_id: string | null
  number_student: number | null
}

export interface AddFieldPayload {
  name: string
  number_groups: number | null
}

export interface AddCoursePayload {
  name: string
  hour: string | null
}

export interface AddPlanningPayload {
  teacher_id:   string
  group_id:     string
  course_id:    string
  day:          Day
  start_time:   string
  end_time:     string
  session_date?: string  // optional — if set, this is a one-time special session
}
