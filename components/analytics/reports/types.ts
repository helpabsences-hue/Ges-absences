// components/analytics/reports/types.ts

export type Lang       = 'fr' | 'en' | 'ar'
export type MainTab    = 'charts' | 'details'
export type StatTab    = 'group' | 'student'
export type FilterType = 'all' | 'absent' | 'late'

export interface GroupStat {
  group_id: string; group_name: string; year: number
  total: number; present: number; absent: number; late: number
  rate: number; absenceMinutes: number
}

export interface StudentStat {
  student_id: string; student_name: string; massar_code: string; group_name: string
  total: number; present: number; absent: number; late: number
  rate: number; absenceMinutes: number
}

export interface AbsenceRow {
  id: string; studentName: string; massarCode: string; groupName: string
  courseName: string; date: string; timeSlot: string
  status: 'absent' | 'late'; reason: string; justified: boolean
  durationMinutes: number
}

export const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

export function rateColor(r: number) { return r >= 85 ? 'text-green-400' : r >= 70 ? 'text-yellow-400' : 'text-red-400' }
export function rateBg(r: number)    { return r >= 85 ? 'bg-green-500'   : r >= 70 ? 'bg-yellow-500'   : 'bg-red-500'   }

export function fmtHours(minutes: number, hoursLabel: string): string {
  if (minutes <= 0) return `0${hoursLabel}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}${hoursLabel}`
  return `${h}${hoursLabel} ${m}min`
}

export function parseTime(t: string): number {
  if (!t) return 0
  const parts = t.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}
