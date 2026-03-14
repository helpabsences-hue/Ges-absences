'use client'
// components/dashboard/GroupForm.tsx

import { useState } from 'react'
import { useGroupStore } from '@/stores/useGroupStore'
import type { GroupWithField, AddGroupPayload } from '@/types'

interface Props {
  editing?:  GroupWithField | null
  onDone:    () => void
}

const EMPTY: AddGroupPayload = {
  name:           '',
  year:           new Date().getFullYear(),
  field_id:       null,
  number_student: null,
}

export default function GroupForm({ editing, onDone }: Props) {
  const { fields, addGroup, updateGroup } = useGroupStore()

  const [form,      setForm]      = useState<AddGroupPayload>(
    editing
      ? { name: editing.name, year: editing.year, field_id: editing.field_id, number_student: editing.number_student }
      : EMPTY
  )
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Name is required.'); return }
    if (!form.year)        { setFormError('Year is required.'); return }
    setSaving(true)
    setFormError('')

    if (editing) {
      await updateGroup(editing.id, form)
    } else {
      await addGroup(form)
    }

    setSaving(false)
    onDone()
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">
        {editing ? 'Edit Group' : 'New Group'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Group name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. 2BAC-A"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Academic year <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={1} max={6}
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Field</label>
            <select
              value={form.field_id ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, field_id: e.target.value || null }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">None</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Number of students</label>
            <input
              type="number"
              min={0}
              value={form.number_student ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  number_student: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              placeholder="Optional"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {formError && <p className="text-xs text-red-400">{formError}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition"
          >
            {saving ? 'Saving…' : editing ? 'Update Group' : 'Add Group'}
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
