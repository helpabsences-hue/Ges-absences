'use client'
// components/dashboard/InviteForm.tsx

import { useEffect, useState } from 'react'
import { useInvitationStore } from '@/stores/useInvitationStore'
import { useAuthStore }       from '@/stores/useAuthStore'
import type { InvitePayload } from '@/types'

const EMPTY: InvitePayload = { email: '', role: 'teacher' }

export default function InviteForm() {
  const { profile }                                             = useAuthStore()
  const { sending, error, success, sendInvitation, clearMessages } = useInvitationStore()

  const [form,      setForm]      = useState<InvitePayload>(EMPTY)
  const [formError, setFormError] = useState('')

  // Auto-clear success after 4s
  useEffect(() => {
    if (!success) return
    const t = setTimeout(clearMessages, 4000)
    return () => clearTimeout(t)
  }, [success, clearMessages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.email.trim()) { setFormError('Email is required.'); return }
    const ok = await sendInvitation(form)
    if (ok) setForm(EMPTY)
  }

  const canInviteAdmin = profile?.role === 'super_admin'

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Send New Invitation</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-3">

          <div className="flex-1 min-w-56">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setFormError('') }}
              placeholder="colleague@school.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="w-44">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'teacher' }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="teacher">Teacher</option>
              {canInviteAdmin && <option value="admin">Admin</option>}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Invite
                </>
              )}
            </button>
          </div>
        </div>

        {(formError || error) && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formError || error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}
      </form>
    </div>
  )
}
