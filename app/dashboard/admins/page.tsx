'use client'
import { toast } from 'sonner'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettingsStore } from '@/stores/useSettingsStore'
import Link from 'next/link'
import type { Profile } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string; subtitleOne: string
  inviteBtn: string; searchPlaceholder: string
  noMatch: string; noAdmins: string; inviteFirst: string; inviteLink: string
  joined: string; sure: string; yesDelete: string; deleting: string; cancel: string
  role: string
}> = {
  fr: {
    title: 'Administrateurs', subtitle: ' administrateurs dans votre école',
    subtitleOne: ' administrateur dans votre école',
    inviteBtn: 'Inviter un Administrateur',
    searchPlaceholder: 'Rechercher par nom ou email…',
    noMatch: 'Aucun administrateur ne correspond à votre recherche',
    noAdmins: 'Aucun administrateur pour le moment',
    inviteFirst: 'Invitez votre premier administrateur depuis la page ',
    inviteLink: 'Invitations', joined: 'Rejoint le',
    sure: 'Sûr ?', yesDelete: 'Oui, supprimer', deleting: 'Suppression…', cancel: 'Annuler',
    role: 'Administrateur',
  },
  en: {
    title: 'Administrators', subtitle: ' administrators in your school',
    subtitleOne: ' administrator in your school',
    inviteBtn: 'Invite Administrator',
    searchPlaceholder: 'Search by name or email…',
    noMatch: 'No administrators match your search',
    noAdmins: 'No administrators yet',
    inviteFirst: 'Invite your first administrator from the ',
    inviteLink: 'Invitations', joined: 'Joined',
    sure: 'Sure?', yesDelete: 'Yes, delete', deleting: 'Deleting…', cancel: 'Cancel',
    role: 'Administrator',
  },
  ar: {
    title: 'المديرون', subtitle: ' مديرون في مدرستك',
    subtitleOne: ' مدير في مدرستك',
    inviteBtn: 'دعوة مدير',
    searchPlaceholder: 'البحث بالاسم أو البريد…',
    noMatch: 'لا يوجد مدير يطابق البحث',
    noAdmins: 'لا يوجد مديرون بعد',
    inviteFirst: 'ادع أول مدير من صفحة ',
    inviteLink: 'الدعوات', joined: 'انضم في',
    sure: 'متأكد؟', yesDelete: 'نعم، احذف', deleting: 'جارٍ الحذف…', cancel: 'إلغاء',
    role: 'مدير',
  },
}

export default function AdminsPage() {
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'
  const dateLocale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR'

  const [admins,      setAdmins]      = useState<Profile[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [confirmId,   setConfirmId]   = useState<string | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('name')
    setAdmins((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
      const data = await res.json()
      if (res.ok) {
        setAdmins(prev => prev.filter(a => a.id !== id))
        toast.success(lang === 'ar' ? 'تم حذف المدير' : lang === 'fr' ? 'Administrateur supprimé' : 'Administrator deleted')
      } else {
        toast.error(data.error ?? 'Échec de la suppression')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
    setDeletingId(null)
    setConfirmId(null)
  }

  const filtered = admins.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`max-w-6xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {admins.length}{admins.length === 1 ? ui.subtitleOne : ui.subtitle}
          </p>
        </div>
        <Link href="/dashboard/invitations"
         className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
            px-4 py-2.5 rounded-xl transition-all w-fit ${isRtl ? 'flex-row-reverse' : ''}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {ui.inviteBtn}
      
        </Link>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <svg className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isRtl ? 'right-3' : 'left-3'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={ui.searchPlaceholder}
          className={`w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isRtl ? 'pr-9 pl-4 text-right' : 'pl-9 pr-4'}`}
        />
      </div>

      {/* List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p className="text-slate-400 font-medium">
              {search ? ui.noMatch : ui.noAdmins}
            </p>
            {!search && (
              <p className="text-slate-600 text-sm">
                {ui.inviteFirst}
                <Link href="/dashboard/invitations" className="text-blue-400 hover:text-blue-300">{ui.inviteLink}</Link>
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map(admin => (
              <div key={admin.id} className={`flex items-center justify-between px-4 sm:px-5 py-4 transition group ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 min-w-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-purple-400">
                      {admin.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <p className="text-sm font-semibold text-white">{admin.name}</p>
                      <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-lg">
                        {ui.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{admin.email}</p>
                    {admin.created_at && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ui.joined} {new Date(admin.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-1 shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {confirmId === admin.id ? (
                    <>
                      <span className="text-xs text-slate-400 mr-1">{ui.sure}</span>
                      <button onClick={() => handleDelete(admin.id)} disabled={!!deletingId}
                        className="text-xs bg-red-500/10 hover:bg-red-600 text-red-400 font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                        {deletingId === admin.id ? ui.deleting : ui.yesDelete}
                      </button>
                      <button onClick={() => setConfirmId(null)}
                        className="text-xs text-slate-500 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition">
                        {ui.cancel}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmId(admin.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
