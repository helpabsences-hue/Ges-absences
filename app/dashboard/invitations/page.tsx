'use client'
// app/dashboard/invitations/page.tsx

import { useEffect, useState } from 'react'
import { useInvitationStore } from '@/stores/useInvitationStore'
import { useAuthStore }       from '@/stores/useAuthStore'
import { useSettingsStore }   from '@/stores/useSettingsStore'
import type { InvitePayload } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string
  totalSent: string; pending: string; accepted: string
  sendTitle: string; emailLabel: string; emailPlaceholder: string
  roleLabel: string; roleTeacher: string; roleAdmin: string
  sendBtn: string; sending: string
  errEmail: string; copyBtn: string; shareLinkLabel: string
  listTitle: string; refresh: string
  colEmail: string; colRole: string; colStatus: string; colSent: string
  noInvitations: string; noInvitationsHint: string
  statusPending: string; statusAccepted: string
  resend: string; sure: string; deleteBtn: string; cancel: string
  justNow: string; mAgo: string; hAgo: string; dAgo: string
}> = {
  fr: {
    title: 'Invitations', subtitle: 'Invitez des administrateurs et des enseignants',
    totalSent: 'Total envoyées', pending: 'En attente', accepted: 'Acceptées',
    sendTitle: 'Envoyer une Invitation',
    emailLabel: 'Adresse email', emailPlaceholder: 'collegue@ecole.com',
    roleLabel: 'Rôle', roleTeacher: 'Enseignant', roleAdmin: 'Administrateur',
    sendBtn: 'Envoyer', sending: 'Envoi…',
    errEmail: 'L\'email est obligatoire.', copyBtn: 'Copier', shareLinkLabel: 'Partagez ce lien manuellement :',
    listTitle: 'Invitations Envoyées', refresh: 'Actualiser',
    colEmail: 'Email', colRole: 'Rôle', colStatus: 'Statut', colSent: 'Envoyée',
    noInvitations: 'Aucune invitation envoyée', noInvitationsHint: 'Envoyez votre première invitation ci-dessus',
    statusPending: 'En attente', statusAccepted: 'Acceptée',
    resend: 'Renvoyer', sure: 'Sûr ?', deleteBtn: 'Supprimer', cancel: 'Annuler',
    justNow: 'à l\'instant', mAgo: 'min', hAgo: 'h', dAgo: 'j',
  },
  en: {
    title: 'Invitations', subtitle: 'Invite admins and teachers to join your school',
    totalSent: 'Total sent', pending: 'Pending', accepted: 'Accepted',
    sendTitle: 'Send New Invitation',
    emailLabel: 'Email address', emailPlaceholder: 'colleague@school.com',
    roleLabel: 'Role', roleTeacher: 'Teacher', roleAdmin: 'Admin',
    sendBtn: 'Send Invite', sending: 'Sending…',
    errEmail: 'Email is required.', copyBtn: 'Copy', shareLinkLabel: 'Share this link manually:',
    listTitle: 'Sent Invitations', refresh: 'Refresh',
    colEmail: 'Email', colRole: 'Role', colStatus: 'Status', colSent: 'Sent',
    noInvitations: 'No invitations sent yet', noInvitationsHint: 'Send your first invitation above',
    statusPending: 'Pending', statusAccepted: 'Accepted',
    resend: 'Resend', sure: 'Sure?', deleteBtn: 'Delete', cancel: 'Cancel',
    justNow: 'just now', mAgo: 'm ago', hAgo: 'h ago', dAgo: 'd ago',
  },
  ar: {
    title: 'الدعوات', subtitle: 'ادع المديرين والأساتذة للانضمام إلى مدرستك',
    totalSent: 'إجمالي المُرسَلة', pending: 'قيد الانتظار', accepted: 'مقبولة',
    sendTitle: 'إرسال دعوة جديدة',
    emailLabel: 'البريد الإلكتروني', emailPlaceholder: 'زميل@مدرسة.com',
    roleLabel: 'الدور', roleTeacher: 'أستاذ', roleAdmin: 'مدير',
    sendBtn: 'إرسال', sending: 'جارٍ الإرسال…',
    errEmail: 'البريد الإلكتروني مطلوب.', copyBtn: 'نسخ', shareLinkLabel: 'شارك هذا الرابط يدوياً:',
    listTitle: 'الدعوات المُرسَلة', refresh: 'تحديث',
    colEmail: 'البريد', colRole: 'الدور', colStatus: 'الحالة', colSent: 'تاريخ الإرسال',
    noInvitations: 'لم يتم إرسال أي دعوات بعد', noInvitationsHint: 'أرسل أول دعوة من الأعلى',
    statusPending: 'قيد الانتظار', statusAccepted: 'مقبولة',
    resend: 'إعادة إرسال', sure: 'متأكد؟', deleteBtn: 'حذف', cancel: 'إلغاء',
    justNow: 'الآن', mAgo: 'د', hAgo: 'س', dAgo: 'ي',
  },
}

const STATUS_STYLES = {
  pending:  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  accepted: 'bg-green-500/10  text-green-400  border border-green-500/20',
}
const ROLE_STYLES = {
  admin:   'bg-purple-500/10 text-purple-400',
  teacher: 'bg-blue-500/10   text-blue-400',
}

const EMPTY: InvitePayload = { email: '', role: 'teacher' }

export default function InvitationsPage() {
  const { profile }    = useAuthStore()
  const { language }   = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const {
    invitations, loading, sending, error, success, inviteUrl,
    fetchInvitations, sendInvitation, resendInvitation, deleteInvitation, clearMessages,
  } = useInvitationStore()

  const [form,            setForm]            = useState<InvitePayload>(EMPTY)
  const [formError,       setFormError]       = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { fetchInvitations() }, [fetchInvitations])
  useEffect(() => {
    if (!success) return
    const t = setTimeout(clearMessages, 4000)
    return () => clearTimeout(t)
  }, [success, clearMessages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.email.trim()) { setFormError(ui.errEmail); return }
    const ok = await sendInvitation(form)
    if (ok) setForm(EMPTY)
  }

  // Time-ago helper using translated suffixes
  const timeAgo = (dateStr: string) => {
    const diff  = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (mins  < 1)  return ui.justNow
    if (mins  < 60) return lang === 'ar' ? `${mins} ${ui.mAgo}` : `${mins}${ui.mAgo}`
    if (hours < 24) return lang === 'ar' ? `${hours} ${ui.hAgo}` : `${hours}${ui.hAgo}`
    return lang === 'ar' ? `${days} ${ui.dAgo}` : `${days}${ui.dAgo}`
  }

  const pendingCount  = invitations.filter(i => i.status === 'pending').length
  const acceptedCount = invitations.filter(i => i.status === 'accepted').length
  const canInviteAdmin = profile?.role === 'super_admin'

  const statusLabel = (s: 'pending' | 'accepted') =>
    s === 'pending' ? ui.statusPending : ui.statusAccepted

  const roleLabel = (r: 'admin' | 'teacher') =>
    r === 'admin' ? ui.roleAdmin : ui.roleTeacher

  return (
    <div className={`max-w-4xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* ── Header ───────────────────────────────────── */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{ui.subtitle}</p>
      </div>

      {/* ── Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: ui.totalSent, value: invitations.length, color: 'text-white'      },
          { label: ui.pending,   value: pendingCount,        color: 'text-yellow-400' },
          { label: ui.accepted,  value: acceptedCount,       color: 'text-green-400'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl px-4 sm:px-5 py-4">
            <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Send form ────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-white mb-4">{ui.sendTitle}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`flex flex-wrap gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>

            {/* Email */}
            <div className="flex-1 min-w-48">
              <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                {ui.emailLabel}
              </label>
              <input type="email" value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormError('') }}
                placeholder={ui.emailPlaceholder}
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
                  text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${isRtl ? 'text-right' : ''}`} />
            </div>

            {/* Role */}
            <div className="w-40 sm:w-44">
              <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                {ui.roleLabel}
              </label>
              <select value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'teacher' }))}
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
                  text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${isRtl ? 'text-right' : ''}`}>
                <option value="teacher">{ui.roleTeacher}</option>
                {canInviteAdmin && <option value="admin">{ui.roleAdmin}</option>}
              </select>
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <button type="submit" disabled={sending}
                className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                  text-white text-sm font-medium px-4 sm:px-5 py-2.5 rounded-xl transition-all
                  ${isRtl ? 'flex-row-reverse' : ''}`}>
                {sending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {ui.sending}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {ui.sendBtn}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {(formError || error) && (
            <div className={`flex items-center gap-2 bg-red-500/10 border border-red-500/20
              rounded-xl px-4 py-3 text-red-400 text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formError || error}
            </div>
          )}

          {/* Success + invite link */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm space-y-2">
              <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
              {inviteUrl && (
                <div className="mt-2 pt-2 border-t border-green-500/20">
                  <p className={`text-xs text-green-300 mb-1.5 ${isRtl ? 'text-right' : ''}`}>{ui.shareLinkLabel}</p>
                  <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <code className="flex-1 text-xs bg-green-500/10 px-2 py-1.5 rounded-lg break-all text-green-200">
                      {inviteUrl}
                    </code>
                    <button onClick={() => navigator.clipboard.writeText(inviteUrl)}
                      className="shrink-0 text-xs bg-green-500/20 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition">
                      {ui.copyBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* ── List ─────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className={`px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center justify-between
          ${isRtl ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-sm font-semibold text-white">{ui.listTitle}</h3>
          <button onClick={fetchInvitations}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
            title={ui.refresh}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">{ui.noInvitations}</p>
            <p className="text-slate-600 text-sm mt-1">{ui.noInvitationsHint}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {[ui.colEmail, ui.colRole, ui.colStatus, ui.colSent, ''].map((h, i) => (
                    <th key={i}
                      className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider
                        ${i === 4 ? '' : isRtl ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition group">

                    {/* Email */}
                    <td className="px-4 sm:px-5 py-4">
                      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <span className="text-sm text-white">{inv.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 sm:px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${ROLE_STYLES[inv.role]}`}>
                        {roleLabel(inv.role)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 sm:px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_STYLES[inv.status]}`}>
                        {statusLabel(inv.status)}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="px-4 sm:px-5 py-4">
                      <span className="text-sm text-slate-500">{timeAgo(inv.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 sm:px-5 py-4">
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition
                        ${isRtl ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                        {confirmDeleteId === inv.id ? (
                          <>
                            <span className="text-xs text-slate-400 mx-1">{ui.sure}</span>
                            <button
                              onClick={async () => { await deleteInvitation(inv.id); setConfirmDeleteId(null) }}
                              className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition">
                              {ui.deleteBtn}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-slate-500 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition">
                              {ui.cancel}
                            </button>
                          </>
                        ) : (
                          <>
                            {inv.status === 'pending' && (
                              <button onClick={() => resendInvitation(inv.id)} disabled={sending}
                                className={`flex items-center gap-1.5 text-xs font-medium text-slate-400
                                  hover:text-blue-400 hover:bg-blue-500/10 px-2.5 sm:px-3 py-1.5 rounded-lg
                                  transition disabled:opacity-40 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {ui.resend}
                              </button>
                            )}
                            <button onClick={() => setConfirmDeleteId(inv.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}