'use client'
// components/dashboard/StudentForm.tsx

import { useState } from 'react'
import { useStudentStore } from '@/stores/useStudentStore'
import { useGroupStore }   from '@/stores/useGroupStore'
import type { StudentWithGroup, AddStudentPayload } from '@/types'

interface Props {
  editing?: StudentWithGroup | null
  onDone:   () => void
}

const EMPTY: AddStudentPayload = { name: '', massar_code: '', group_id: '' }

export default function StudentForm({ editing, onDone }: Props) {
  const { addStudent, updateStudent } = useStudentStore()
  const { groups }                    = useGroupStore()

  const [form, setForm]           = useState<AddStudentPayload>(
    editing
      ? { name: editing.name, massar_code: editing.massar_code, group_id: editing.group_id ?? '' }
      : EMPTY
  )
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())        { setFormError('Name is required.'); return }
    if (!form.massar_code.trim()) { setFormError('Massar code is required.'); return }
    if (!form.group_id)           { setFormError('Please select a group.'); return }
    setSaving(true)
    setFormError('')

    if (editing) {
      await updateStudent(editing.id, form)
    } else {
      await addStudent(form)
    }

    setSaving(false)
    onDone()
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">
        {editing ? 'Edit Student' : 'New Student'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Full name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Student full name"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Massar code <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.massar_code}
              onChange={(e) => setForm((f) => ({ ...f, massar_code: e.target.value.toUpperCase() }))}
              placeholder="e.g. G123456789"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
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
                <option key={g.id} value={g.id}>
                  {g.name} (Year {g.year})
                </option>
              ))}
            </select>
          </div>
        </div>

        {formError && <p className="text-xs text-red-400">{formError}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition"
          >
            {saving ? 'Saving…' : editing ? 'Update Student' : 'Add Student'}
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
