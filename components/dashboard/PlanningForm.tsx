'use client'
// components/dashboard/PlanningForm.tsx

import { useState } from 'react'
import { usePlanningStore } from '@/stores/usePlanningStore'
import type { AddPlanningPayload, Day } from '@/types'

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const EMPTY: AddPlanningPayload = {
  teacher_id: '',
  group_id:   '',
  course_id:  '',
  day:        'Monday',
  start_time: '08:00',
  end_time:   '09:00',
}

interface Props {
  onDone: () => void
}

export default function PlanningForm({ onDone }: Props) {
  const { teachers, groups, courses, addSlot } = usePlanningStore()

  const [form,      setForm]      = useState<AddPlanningPayload>(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.teacher_id) { setFormError('Please select a teacher.'); return }
    if (!form.group_id)   { setFormError('Please select a group.');   return }
    if (!form.course_id)  { setFormError('Please select a course.');  return }
    if (form.start_time >= form.end_time) {
      setFormError('End time must be after start time.')
      return
    }

    setSaving(true)
    setFormError('')
    const id = await addSlot(form)
    setSaving(false)

    if (!id) {
      const storeErr = usePlanningStore.getState().error
      if (storeErr) setFormError(storeErr)
      return
    }

    onDone()
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-white mb-5">New Planning Slot</h3>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Row 1: Teacher / Group / Course */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Teacher <span className="text-red-400">*</span>
            </label>
            <select
              value={form.teacher_id}
              onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">Select teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Group <span className="text-red-400">*</span>
            </label>
            <select
              value={form.group_id}
              onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">Select group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name} — Y{g.year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Course <span className="text-red-400">*</span>
            </label>
            <select
              value={form.course_id}
              onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Day / Start / End */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Day <span className="text-red-400">*</span>
            </label>
            <select
              value={form.day}
              onChange={(e) => setForm((f) => ({ ...f, day: e.target.value as Day }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Start time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              End time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {formError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition"
          >
            {saving ? 'Saving…' : 'Add Slot'}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-slate-800 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
