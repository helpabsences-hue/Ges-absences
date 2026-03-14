'use client'
// app/dashboard/teachers/page.tsx

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettingsStore } from '@/stores/useSettingsStore'
import Link from 'next/link'
import type { Profile } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string; subtitleOne: string
  inviteBtn: string; searchPlaceholder: string
  noMatch: string; noTeachers: string; inviteFirst: string
  inviteLink: string; teacher: string
  groups: string; groupOne: string
  courses: string; courseOne: string
  joined: string; sure: string; yesDelete: string
  deleting: string; cancel: string
}> = {
  fr: {
    title:           'Enseignants',
    subtitle:        ' enseignants dans votre école',
    subtitleOne:     ' enseignant dans votre école',
    inviteBtn:       'Inviter un Enseignant',
    searchPlaceholder: 'Rechercher par nom ou email…',
    noMatch:         'Aucun enseignant ne correspond à votre recherche',
    noTeachers:      'Aucun enseignant pour le moment',
    inviteFirst:     'Invitez votre premier enseignant depuis la page ',
    inviteLink:      'Invitations',
    teacher:         'Enseignant',
    groups:          ' groupes',    groupOne:  ' groupe',
    courses:         ' matières',   courseOne: ' matière',
    joined:          'Rejoint le',
    sure:            'Sûr ?',
    yesDelete:       'Oui, supprimer',
    deleting:        'Suppression…',
    cancel:          'Annuler',
  },
  en: {
    title:           'Teachers',
    subtitle:        ' teachers in your school',
    subtitleOne:     ' teacher in your school',
    inviteBtn:       'Invite Teacher',
    searchPlaceholder: 'Search by name or email…',
    noMatch:         'No teachers match your search',
    noTeachers:      'No teachers yet',
    inviteFirst:     'Invite your first teacher from the ',
    inviteLink:      'Invitations',
    teacher:         'Teacher',
    groups:          ' groups',    groupOne:  ' group',
    courses:         ' courses',   courseOne: ' course',
    joined:          'Joined',
    sure:            'Sure?',
    yesDelete:       'Yes, delete',
    deleting:        'Deleting…',
    cancel:          'Cancel',
  },
  ar: {
    title:           'الأساتذة',
    subtitle:        ' أستاذ في مدرستك',
    subtitleOne:     ' أستاذ في مدرستك',
    inviteBtn:       'دعوة أستاذ',
    searchPlaceholder: 'البحث بالاسم أو البريد…',
    noMatch:         'لا يوجد أستاذ يطابق بحثك',
    noTeachers:      'لا يوجد أساتذة بعد',
    inviteFirst:     'ادع أول أستاذ من صفحة ',
    inviteLink:      'الدعوات',
    teacher:         'أستاذ',
    groups:          ' فصول',    groupOne:  ' فصل',
    courses:         ' مواد',    courseOne: ' مادة',
    joined:          'انضم في',
    sure:            'متأكد؟',
    yesDelete:       'نعم، حذف',
    deleting:        'جارٍ الحذف…',
    cancel:          'إلغاء',
  },
}

interface TeacherRow extends Profile {
  group_count:  number
  course_count: number
  group_names:  string[]
  course_names: string[]
}

export default function TeachersPage() {
  const { language }               = useSettingsStore()
  const lang                       = (language || 'fr') as Lang
  const ui                         = UI[lang]
  const isRtl                      = lang === 'ar'
  const dateLocale                 = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR'

  const [teachers,   setTeachers]   = useState<TeacherRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId,  setConfirmId]  = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select(`*, teacher_planning ( group_id, course_id, groups(name), courses(name) )`)
      .eq('role', 'teacher')
      .order('name')

    if (error || !data) { setLoading(false); return }

    setTeachers(data.map((t: any) => {
      const slots       = t.teacher_planning ?? []
      const groupNames  = [...new Set(slots.map((s: any) => s.groups?.name).filter(Boolean))]  as string[]
      const courseNames = [...new Set(slots.map((s: any) => s.courses?.name).filter(Boolean))] as string[]
      return { ...t, group_count: groupNames.length, course_count: courseNames.length, group_names: groupNames, course_names: courseNames }
    }))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('teacher_planning').delete().eq('teacher_id', id)
    await supabase.from('profiles').delete().eq('id', id)
    await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    setDeletingId(null)
    setConfirmId(null)
    setTeachers((prev) => prev.filter((t) => t.id !== id))
  }

  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={`max-w-5xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {teachers.length}{teachers.length !== 1 ? ui.subtitle : ui.subtitleOne}
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
        <svg className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500
          ${isRtl ? 'right-3' : 'left-3'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={ui.searchPlaceholder}
          className={`w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-sm
            text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
            ${isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'}`}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
          <p className="text-slate-400 font-medium">
            {search ? ui.noMatch : ui.noTeachers}
          </p>
          {!search && (
            <p className="text-slate-600 text-sm mt-1">
              {ui.inviteFirst}
              <Link href="/dashboard/invitations" className="text-blue-400 hover:underline">{ui.inviteLink}</Link>
            </p>
          )}
        </div>

      ) : (
        <div className="space-y-3">
          {filtered.map((teacher) => (
            <div key={teacher.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition group">
              <div className={`flex items-start gap-3 sm:gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>

                {/* Avatar */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-500/20 border border-green-500/30
                  flex items-center justify-center shrink-0">
                  <span className="text-sm sm:text-base font-bold text-green-400">
                    {teacher.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <p className="text-sm font-semibold text-white">{teacher.name}</p>
                    <span className="text-xs bg-green-500/10 text-green-400 font-medium px-1.5 py-0.5 rounded-md">
                      {ui.teacher}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{teacher.email}</p>

                  {/* Stats row */}
                  <div className={`flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3 text-xs text-slate-400 flex-wrap
                    ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span>
                      {teacher.group_count}{teacher.group_count !== 1 ? ui.groups : ui.groupOne}
                    </span>
                    <span>
                      {teacher.course_count}{teacher.course_count !== 1 ? ui.courses : ui.courseOne}
                    </span>
                    <span>
                      {ui.joined} {new Date(teacher.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Tags */}
                  {(teacher.course_names.length > 0 || teacher.group_names.length > 0) && (
                    <div className={`flex flex-wrap gap-1.5 mt-2 sm:mt-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      {teacher.course_names.map((n) => (
                        <span key={n} className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md">{n}</span>
                      ))}
                      {teacher.group_names.map((n) => (
                        <span key={n} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">{n}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <div className="shrink-0">
                  {confirmId === teacher.id ? (
                    <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs text-slate-400">{ui.sure}</span>
                      <button
                        onClick={() => handleDelete(teacher.id)}
                        disabled={deletingId === teacher.id}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {deletingId === teacher.id ? ui.deleting : ui.yesDelete}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs text-slate-500 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition"
                      >
                        {ui.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(teacher.id)}
                      className="opacity-0 group-hover:opacity-100 transition p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                      title={ui.yesDelete}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}