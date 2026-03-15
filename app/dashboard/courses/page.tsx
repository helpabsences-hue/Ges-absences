'use client'

export const dynamic = 'force-dynamic'
// app/dashboard/courses/page.tsx

import { useEffect, useState } from 'react'
import { useCourseStore }   from '@/stores/useCourseStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { Course, AddCoursePayload } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string; subtitleOne: string
  addCourse: string; editCourse: string; newCourse: string
  courseName: string; courseNamePlaceholder: string
  duration: string; durationHint: string
  perSession: string
  errName: string; saving: string; update: string; add: string; cancel: string
  searchPlaceholder: string
  noMatch: string; noCourses: string
  confirmDelete: string
}> = {
  fr: {
    title: 'Matières', subtitle: ' matières configurées', subtitleOne: ' matière configurée',
    addCourse: 'Ajouter une Matière', editCourse: 'Modifier la Matière', newCourse: 'Nouvelle Matière',
    courseName: 'Nom de la matière', courseNamePlaceholder: 'ex. Mathématiques',
    duration: 'Durée de séance', durationHint: 'HH:MM — ex. 01:30 pour 1h 30min',
    perSession: 'par séance',
    errName: 'Le nom est obligatoire.',
    saving: 'Enregistrement…', update: 'Modifier', add: 'Ajouter', cancel: 'Annuler',
    searchPlaceholder: 'Rechercher des matières…',
    noMatch: 'Aucune matière ne correspond', noCourses: 'Aucune matière pour le moment',
    confirmDelete: 'Supprimer cette matière ? Elle sera retirée de tous les créneaux de planning.',
  },
  en: {
    title: 'Courses', subtitle: ' courses configured', subtitleOne: ' course configured',
    addCourse: 'Add Course', editCourse: 'Edit Course', newCourse: 'New Course',
    courseName: 'Course name', courseNamePlaceholder: 'e.g. Mathematics',
    duration: 'Session duration', durationHint: 'HH:MM — e.g. 01:30 for 1h 30min',
    perSession: 'per session',
    errName: 'Name is required.',
    saving: 'Saving…', update: 'Update Course', add: 'Add Course', cancel: 'Cancel',
    searchPlaceholder: 'Search courses…',
    noMatch: 'No courses match your search', noCourses: 'No courses yet',
    confirmDelete: 'Delete this course? It will be removed from all planning slots.',
  },
  ar: {
    title: 'المواد', subtitle: ' مادة مضبوطة', subtitleOne: ' مادة مضبوطة',
    addCourse: 'إضافة مادة', editCourse: 'تعديل المادة', newCourse: 'مادة جديدة',
    courseName: 'اسم المادة', courseNamePlaceholder: 'مثال: الرياضيات',
    duration: 'مدة الحصة', durationHint: 'HH:MM — مثال: 01:30 لمدة ساعة ونصف',
    perSession: 'لكل حصة',
    errName: 'الاسم مطلوب.',
    saving: 'جارٍ الحفظ…', update: 'تعديل', add: 'إضافة', cancel: 'إلغاء',
    searchPlaceholder: 'البحث في المواد…',
    noMatch: 'لا توجد مادة تطابق البحث', noCourses: 'لا توجد مواد بعد',
    confirmDelete: 'حذف هذه المادة؟ سيتم إزالتها من جميع خانات التخطيط.',
  },
}

const EMPTY: AddCoursePayload = { name: '', hour: null }

const ACCENT_COLORS = [
  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'bg-green-500/10  text-green-400  border-green-500/20',
  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'bg-pink-500/10   text-pink-400   border-pink-500/20',
  'bg-teal-500/10   text-teal-400   border-teal-500/20',
  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'bg-red-500/10    text-red-400    border-red-500/20',
]

function formatHour(h: string | null) {
  if (!h) return null
  const [hours, minutes] = h.split(':')
  const hNum = parseInt(hours), mNum = parseInt(minutes)
  if (hNum === 0 && mNum === 0) return null
  const parts = []
  if (hNum > 0) parts.push(`${hNum}h`)
  if (mNum > 0) parts.push(`${mNum}min`)
  return parts.join(' ')
}

export default function CoursesPage() {
  const { courses, loading, error, fetchCourses, addCourse, updateCourse, deleteCourse } = useCourseStore()
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<AddCoursePayload>(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [search,    setSearch]    = useState('')

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const openAdd  = () => { setEditId(null); setForm(EMPTY); setFormError(''); setShowForm(true) }
  const openEdit = (c: Course) => { setEditId(c.id); setForm({ name: c.name, hour: c.hour }); setFormError(''); setShowForm(true) }
  const handleCancel = () => { setShowForm(false); setEditId(null); setForm(EMPTY); setFormError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError(ui.errName); return }
    setSaving(true); setFormError('')
    if (editId) { await updateCourse(editId, form) } else { await addCourse(form) }
    setSaving(false); handleCancel()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(ui.confirmDelete)) return
    await deleteCourse(id)
  }

  const filtered = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const inputCls = `w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
    text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
    ${isRtl ? 'text-right' : ''}`

  return (
    <div className={`max-w-4xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between
        ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {courses.length}{courses.length !== 1 ? ui.subtitle : ui.subtitleOne}
          </p>
        </div>
        <button onClick={openAdd}
          className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
            px-4 py-2.5 rounded-xl transition-all w-fit ${isRtl ? 'flex-row-reverse' : ''}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {ui.addCourse}
        </button>
      </div>

      {/* ── Form ───────────────────────────────────────── */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            {editId ? ui.editCourse : ui.newCourse}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.courseName} <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={ui.courseNamePlaceholder} className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.duration}
                </label>
                <input type="time" value={form.hour ?? ''}
                  onChange={e => setForm(f => ({ ...f, hour: e.target.value || null }))}
                  className={inputCls} />
                <p className={`text-xs text-slate-600 mt-1 ${isRtl ? 'text-right' : ''}`}>
                  {ui.durationHint}
                </p>
              </div>
            </div>

            {formError && <p className="text-xs text-red-400">{formError}</p>}

            <div className={`flex gap-3 pt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition">
                {saving ? ui.saving : editId ? ui.update : ui.add}
              </button>
              <button type="button" onClick={handleCancel}
                className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-slate-800 transition">
                {ui.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {/* ── Search ─────────────────────────────────────── */}
      <div className="relative w-full sm:max-w-xs">
        <svg className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 ${isRtl ? 'right-3' : 'left-3'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={ui.searchPlaceholder}
          className={`w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-sm text-white
            placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
            ${isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'}`} />
      </div>

      {/* ── Grid ───────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">
            {search ? ui.noMatch : ui.noCourses}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((course, index) => {
            const color    = ACCENT_COLORS[index % ACCENT_COLORS.length]
            const duration = formatHour(course.hour)
            return (
              <div key={course.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3
                  group hover:border-slate-700 transition">

                {/* Icon + actions */}
                <div className={`flex items-start justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center
                    text-base sm:text-lg font-bold ${color}`}>
                    {course.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition
                    ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <button onClick={() => openEdit(course)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(course.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Name + duration */}
                <div className={isRtl ? 'text-right' : ''}>
                  <p className="text-sm font-semibold text-white leading-tight">{course.name}</p>
                  {duration && (
                    <p className={`text-xs text-slate-500 mt-1 flex items-center gap-1
                      ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {duration} {ui.perSession}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
