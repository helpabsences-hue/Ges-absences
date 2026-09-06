'use client'
// app/dashboard/invitations/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { useInvitationStore } from '@/stores/useInvitationStore'
import { useAuthStore }       from '@/stores/useAuthStore'
import { useSettingsStore }   from '@/stores/useSettingsStore'
import { createClient }       from '@/lib/supabase/client'
import { toast }              from 'sonner'
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
  parentTitle: string; parentSubtitle: string
  parentSearch: string; parentFilterAll: string; parentFilterPending: string
  parentFilterQueued: string; parentFilterInvited: string; parentFilterAccepted: string
  parentSendBtn: string; parentSending: string; parentSelected: string
  parentNoEmail: string; parentNoStudents: string; parentSelectAll: string
  parentDeselectAll: string; parentProgress: string; parentRemaining: string
  parentSuccessQueued: string; parentColStudent: string; parentColGroup: string
  parentColEmail: string; parentColStatus: string
  parentNotInvited: string; parentQueued: string; parentInvited: string; parentAccepted: string
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
    parentTitle: 'Invitations Parents',
    parentSubtitle: 'Invitez les parents à accéder à l\'espace parent',
    parentSearch: 'Rechercher un étudiant...', parentFilterAll: 'Tous',
    parentFilterPending: 'Non invités', parentFilterQueued: 'En attente',
    parentFilterInvited: 'Invités', parentFilterAccepted: 'Acceptés',
    parentSendBtn: 'Envoyer les invitations', parentSending: 'Envoi en cours...',
    parentSelected: 'sélectionné(s)', parentNoEmail: 'Pas d\'email parent',
    parentNoStudents: 'Aucun étudiant trouvé', parentSelectAll: 'Tout sélectionner',
    parentDeselectAll: 'Désélectionner', parentProgress: 'Progression',
    parentRemaining: 'restants', parentSuccessQueued: 'invitations ajoutées à la file',
    parentColStudent: 'Étudiant', parentColGroup: 'Groupe',
    parentColEmail: 'Email Parent', parentColStatus: 'Statut',
    parentNotInvited: 'Non invité', parentQueued: 'En attente',
    parentInvited: 'Invité', parentAccepted: 'Accepté',
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
    parentTitle: 'Parent Invitations',
    parentSubtitle: 'Invite parents to access the parent portal',
    parentSearch: 'Search student...', parentFilterAll: 'All',
    parentFilterPending: 'Not invited', parentFilterQueued: 'Queued',
    parentFilterInvited: 'Invited', parentFilterAccepted: 'Accepted',
    parentSendBtn: 'Send invitations', parentSending: 'Sending...',
    parentSelected: 'selected', parentNoEmail: 'No parent email',
    parentNoStudents: 'No students found', parentSelectAll: 'Select all',
    parentDeselectAll: 'Deselect all', parentProgress: 'Progress',
    parentRemaining: 'remaining', parentSuccessQueued: 'invitations added to queue',
    parentColStudent: 'Student', parentColGroup: 'Group',
    parentColEmail: 'Parent Email', parentColStatus: 'Status',
    parentNotInvited: 'Not invited', parentQueued: 'Queued',
    parentInvited: 'Invited', parentAccepted: 'Accepted',
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
    parentTitle: 'دعوات أولياء الأمور',
    parentSubtitle: 'ادع أولياء الأمور للوصول إلى فضاء الوالدين',
    parentSearch: 'ابحث عن طالب...', parentFilterAll: 'الكل',
    parentFilterPending: 'غير مدعو', parentFilterQueued: 'في الانتظار',
    parentFilterInvited: 'تمت الدعوة', parentFilterAccepted: 'قبل',
    parentSendBtn: 'إرسال الدعوات', parentSending: 'جارٍ الإرسال...',
    parentSelected: 'محدد', parentNoEmail: 'لا يوجد بريد',
    parentNoStudents: 'لا يوجد طلاب', parentSelectAll: 'تحديد الكل',
    parentDeselectAll: 'إلغاء التحديد', parentProgress: 'التقدم',
    parentRemaining: 'متبقي', parentSuccessQueued: 'دعوة أضيفت للقائمة',
    parentColStudent: 'الطالب', parentColGroup: 'الفصل',
    parentColEmail: 'بريد ولي الأمر', parentColStatus: 'الحالة',
    parentNotInvited: 'غير مدعو', parentQueued: 'في الانتظار',
    parentInvited: 'تمت الدعوة', parentAccepted: 'قبل',
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

type ParentInviteStatus = 'not_invited' | 'queued' | 'invited' | 'accepted'

interface StudentRow {
  id: string; name: string; massar_code: string
  group_name: string; parent_email: string | null
  parent_name: string | null; parent_invite_status: ParentInviteStatus
}

const EMPTY: InvitePayload = { email: '', role: 'teacher' }

export default function InvitationsPage() {
  const { profile }    = useAuthStore()
  const { language }   = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  // ── Staff invitations ──────────────────────────────────
  const {
    invitations, loading, sending, error, success, inviteUrl,
    fetchInvitations, sendInvitation, resendInvitation, deleteInvitation, clearMessages,
  } = useInvitationStore()

  const [form,            setForm]            = useState<InvitePayload>(EMPTY)
  const [formError,       setFormError]       = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ── Parent invitations ─────────────────────────────────
  const [students,       setStudents]       = useState<StudentRow[]>([])
  const [studentsLoading,setStudentsLoading] = useState(true)
  const [parentSearch,   setParentSearch]   = useState('')
  const [parentFilter,   setParentFilter]   = useState<'all' | ParentInviteStatus>('all')
  const [selected,       setSelected]       = useState<Set<string>>(new Set())
  const [parentSending,  setParentSending]  = useState(false)
  const [progress,       setProgress]       = useState<{ sent: number; total: number; remaining: number } | null>(null)

  useEffect(() => { fetchInvitations() }, [fetchInvitations])
  useEffect(() => {
    if (!success) return
    const t = setTimeout(clearMessages, 4000)
    return () => clearTimeout(t)
  }, [success, clearMessages])

  const fetchStudents = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('students')
      .select('id, name, massar_code, parent_email, parent_name, parent_invite_status, groups(name)')
      .order('name')
    setStudents((data ?? []).map((s: any) => ({
      id: s.id, name: s.name, massar_code: s.massar_code,
      group_name: s.groups?.name ?? '—',
      parent_email: s.parent_email, parent_name: s.parent_name,
      parent_invite_status: s.parent_invite_status ?? 'not_invited',
    })))
    setStudentsLoading(false)
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!form.email.trim()) { setFormError(ui.errEmail); return }
    const ok = await sendInvitation(form)
    if (ok) setForm(EMPTY)
  }

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

  const parentFiltered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
      s.massar_code?.toLowerCase().includes(parentSearch.toLowerCase())
    const matchFilter = parentFilter === 'all' || s.parent_invite_status === parentFilter
    return matchSearch && matchFilter
  })

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const toggleSelectAll = () => {
    const invitable = parentFiltered.filter(s => s.parent_email && s.parent_invite_status === 'not_invited')
    if (invitable.every(s => selected.has(s.id))) setSelected(new Set())
    else setSelected(new Set(invitable.map(s => s.id)))
  }

  const handleSendParentInvitations = async () => {
    if (selected.size === 0) return
    setParentSending(true)
    setProgress({ sent: 0, total: selected.size, remaining: selected.size })
    try {
      const res = await fetch('/api/queue-invitations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.queued} ${ui.parentSuccessQueued}`)
      setSelected(new Set())

      const poll = setInterval(async () => {
        const batchRes = await fetch('/api/invite-batch', { method: 'POST' })
        const batchData = await batchRes.json()
        setProgress(prev => prev ? {
          sent: prev.total - (batchData.remaining ?? 0),
          total: prev.total, remaining: batchData.remaining ?? 0,
        } : null)
        if (batchData.remaining === 0) {
          clearInterval(poll); setParentSending(false); setProgress(null); fetchStudents()
        }
      }, 12000)
    } catch (err: any) {
      toast.error(err.message); setParentSending(false); setProgress(null)
    }
  }

  const invitableSelected = Array.from(selected).filter(id =>
    students.find(s => s.id === id)?.parent_email
  ).length

  const parentStats = {
    notInvited: students.filter(s => s.parent_invite_status === 'not_invited').length,
    queued:     students.filter(s => s.parent_invite_status === 'queued').length,
    invited:    students.filter(s => s.parent_invite_status === 'invited').length,
    accepted:   students.filter(s => s.parent_invite_status === 'accepted').length,
  }

  const pendingCount   = invitations.filter(i => i.status === 'pending').length
  const acceptedCount  = invitations.filter(i => i.status === 'accepted').length
  const canInviteAdmin = profile?.role === 'super_admin'

  const parentStatusBadge = (status: ParentInviteStatus) => {
    const map = {
      not_invited: { label: ui.parentNotInvited, cls: 'bg-slate-500/15 text-slate-400' },
      queued:      { label: ui.parentQueued,      cls: 'bg-amber-500/15 text-amber-400' },
      invited:     { label: ui.parentInvited,     cls: 'bg-blue-500/15 text-blue-400'   },
      accepted:    { label: ui.parentAccepted,    cls: 'bg-green-500/15 text-green-400' },
    }
    const { label, cls } = map[status] ?? map.not_invited
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${cls}`}>{label}</span>
  }

  return (
    <div className={`max-w-6xl mx-auto space-y-6 sm:space-y-8 ${isRtl ? 'text-right' : ''}`}>

      {/* ════════════════════════════════════════════════ */}
      {/* SECTION 1 — Staff invitations (existing)        */}
      {/* ════════════════════════════════════════════════ */}

      <div className="space-y-4 sm:space-y-5">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{ui.subtitle}</p>
        </div>

        {/* Stats */}
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

        {/* Send form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-white mb-4">{ui.sendTitle}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`flex flex-wrap gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="flex-1 min-w-48">
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>{ui.emailLabel}</label>
                <input type="email" value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormError('') }}
                  placeholder={ui.emailPlaceholder}
                  className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isRtl ? 'text-right' : ''}`} />
              </div>
              <div className="w-40 sm:w-44">
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>{ui.roleLabel}</label>
                <select value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'teacher' }))}
                  className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isRtl ? 'text-right' : ''}`}>
                  <option value="teacher">{ui.roleTeacher}</option>
                  {canInviteAdmin && <option value="admin">{ui.roleAdmin}</option>}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={sending}
                  className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 sm:px-5 py-2.5 rounded-xl transition-all ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {sending ? (
                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{ui.sending}</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>{ui.sendBtn}</>
                  )}
                </button>
              </div>
            </div>
            {(formError || error) && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {formError || error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm space-y-2">
                <p>{success}</p>
                {inviteUrl && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-green-500/20">
                    <code className="flex-1 text-xs bg-green-500/10 px-2 py-1.5 rounded-lg break-all text-green-200">{inviteUrl}</code>
                    <button onClick={() => navigator.clipboard.writeText(inviteUrl)}
                      className="text-xs bg-green-500/20 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition">{ui.copyBtn}</button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Invitations list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className={`px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h3 className="text-sm font-semibold text-white">{ui.listTitle}</h3>
            <button onClick={fetchInvitations} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-slate-400 font-medium">{ui.noInvitations}</p>
              <p className="text-slate-600 text-sm mt-1">{ui.noInvitationsHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {[ui.colEmail, ui.colRole, ui.colStatus, ui.colSent, ''].map((h, i) => (
                      <th key={i} className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${i === 4 ? '' : isRtl ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition group">
                      <td className="px-4 sm:px-5 py-4"><span className="text-sm text-white">{inv.email}</span></td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${ROLE_STYLES[inv.role]}`}>
                          {inv.role === 'admin' ? ui.roleAdmin : ui.roleTeacher}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_STYLES[inv.status]}`}>
                          {inv.status === 'pending' ? ui.statusPending : ui.statusAccepted}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-4"><span className="text-sm text-slate-500">{timeAgo(inv.created_at)}</span></td>
                      <td className="px-4 sm:px-5 py-4">
                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ${isRtl ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                          {confirmDeleteId === inv.id ? (
                            <>
                              <span className="text-xs text-slate-400 mx-1">{ui.sure}</span>
                              <button onClick={async () => { await deleteInvitation(inv.id); setConfirmDeleteId(null) }}
                                className="text-xs bg-red-500/10 hover:bg-red-800 text-red-600 font-semibold px-2.5 py-1.5 rounded-lg transition">{ui.deleteBtn}</button>
                              <button onClick={() => setConfirmDeleteId(null)}
                                className="text-xs text-slate-500 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition">{ui.cancel}</button>
                            </>
                          ) : (
                            <>
                              {inv.status === 'pending' && (
                                <button onClick={() => resendInvitation(inv.id)} disabled={sending}
                                  className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 px-2.5 py-1.5 rounded-lg transition disabled:opacity-40">
                                  {ui.resend}
                                </button>
                              )}
                              <button onClick={() => setConfirmDeleteId(inv.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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

      {/* ════════════════════════════════════════════════ */}
      {/* SECTION 2 — Parent invitations (new)            */}
      {/* ════════════════════════════════════════════════ */}

      <div className="space-y-4 sm:space-y-5">
        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-800"/>
          <span className="text-xs text-slate-600 font-medium uppercase tracking-wider">Parents</span>
          <div className="flex-1 h-px bg-slate-800"/>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.parentTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{ui.parentSubtitle}</p>
        </div>

        {/* Parent stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: ui.parentFilterPending,  value: parentStats.notInvited, color: 'text-slate-400',  bg: 'bg-slate-900' },
            { label: ui.parentFilterQueued,   value: parentStats.queued,     color: 'text-amber-400',  bg: 'bg-amber-500/10' },
            { label: ui.parentFilterInvited,  value: parentStats.invited,    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { label: ui.parentFilterAccepted, value: parentStats.accepted,   color: 'text-green-400',  bg: 'bg-green-500/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-400 font-medium">{ui.parentProgress}</span>
              <span className="text-slate-400">{progress.sent}/{progress.total} — {progress.remaining} {ui.parentRemaining}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress.total > 0 ? (progress.sent / progress.total) * 100 : 0}%` }}/>
            </div>
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-blue-400">
              {selected.size} {ui.parentSelected}
              {invitableSelected < selected.size && (
                <span className="text-amber-400 ml-2 text-xs">({selected.size - invitableSelected} {ui.parentNoEmail})</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">
                {ui.parentDeselectAll}
              </button>
              <button onClick={handleSendParentInvitations} disabled={parentSending || invitableSelected === 0}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 flex items-center gap-2">
                {parentSending ? (
                  <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>{ui.parentSending}</>
                ) : `📧 ${ui.parentSendBtn} (${invitableSelected})`}
              </button>
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input value={parentSearch} onChange={e => setParentSearch(e.target.value)}
              placeholder={ui.parentSearch}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 flex-wrap">
            {([
              ['all', ui.parentFilterAll],
              ['not_invited', ui.parentFilterPending],
              ['queued', ui.parentFilterQueued],
              ['invited', ui.parentFilterInvited],
              ['accepted', ui.parentFilterAccepted],
            ] as [string, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setParentFilter(key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  parentFilter === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Students table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {studentsLoading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : parentFiltered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400">{ui.parentNoStudents}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox"
                        checked={parentFiltered.filter(s => s.parent_email && s.parent_invite_status === 'not_invited').length > 0 &&
                                 parentFiltered.filter(s => s.parent_email && s.parent_invite_status === 'not_invited').every(s => selected.has(s.id))}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 cursor-pointer"/>
                    </th>
                    {[ui.parentColStudent, ui.parentColGroup, ui.parentColEmail, ui.parentColStatus].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parentFiltered.map(s => {
                    const canInvite = !!s.parent_email && s.parent_invite_status === 'not_invited'
                    return (
                      <tr key={s.id} className={`hover:bg-slate-800/40 transition ${selected.has(s.id) ? 'bg-blue-600/5' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => canInvite && toggleSelect(s.id)}
                            disabled={!canInvite}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"/>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-slate-300">{s.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{s.name}</p>
                              <p className="text-xs text-slate-500 font-mono">{s.massar_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-400">{s.group_name}</span>
                        </td>
                        <td className="px-4 py-3">
                          {s.parent_email
                            ? <span className="text-sm text-white">{s.parent_email}</span>
                            : <span className="text-xs text-slate-600 italic">{ui.parentNoEmail}</span>
                          }
                        </td>
                        <td className="px-4 py-3">{parentStatusBadge(s.parent_invite_status)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 text-center pb-4">
          {students.length} étudiants · {parentStats.accepted} parents connectés
        </p>
      </div>
    </div>
  )
}