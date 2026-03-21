'use client'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'
// app/dashboard/planning/page.tsx

import { useEffect, useState } from 'react'
import { usePlanningStore }  from '@/stores/usePlanningStore'
import { useSettingsStore }  from '@/stores/useSettingsStore'
import type { AddPlanningPayload, Day, TeacherPlanningFull } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

// ── Day names per language ────────────────────────────────
const DAY_LABELS: Record<Day, Record<Lang, string>> = {
  Monday:    { fr: 'Lundi',    en: 'Monday',    ar: 'الاثنين'   },
  Tuesday:   { fr: 'Mardi',    en: 'Tuesday',   ar: 'الثلاثاء'  },
  Wednesday: { fr: 'Mercredi', en: 'Wednesday', ar: 'الأربعاء'  },
  Thursday:  { fr: 'Jeudi',    en: 'Thursday',  ar: 'الخميس'    },
  Friday:    { fr: 'Vendredi', en: 'Friday',     ar: 'الجمعة'    },
  Saturday:  { fr: 'Samedi',   en: 'Saturday',  ar: 'السبت'     },
}

const UI: Record<Lang, {
  title: string; subtitle: string; subtitleOne: string
  addSlot: string; newSlot: string
  teacher: string; selectTeacher: string
  group: string; selectGroup: string; year: string
  course: string; selectCourse: string
  day: string; startTime: string; endTime: string
  errTeacher: string; errGroup: string; errCourse: string; errTime: string
  saving: string; add: string; cancel: string
  allTeachers: string; allDays: string; clear: string
  noSlots: string; noSlotsHint: string; noSlotsFilter: string
  slotsCount: string; slotOne: string
  colTime: string; colTeacher: string; colGroup: string; colCourse: string
  confirmDelete: string; noSlotsDay: string
}> = {
  fr: {
    title: 'Planning', subtitle: ' créneaux au total', subtitleOne: ' créneau au total',
    addSlot: 'Ajouter un Créneau', newSlot: 'Nouveau Créneau',
    teacher: 'Enseignant', selectTeacher: 'Choisir un enseignant',
    group: 'Groupe', selectGroup: 'Choisir un groupe', year: 'A',
    course: 'Matière', selectCourse: 'Choisir une matière',
    day: 'Jour', startTime: 'Heure de début', endTime: 'Heure de fin',
    errTeacher: 'Veuillez choisir un enseignant.', errGroup: 'Veuillez choisir un groupe.',
    errCourse: 'Veuillez choisir une matière.', errTime: 'L\'heure de fin doit être après l\'heure de début.',
    saving: 'Enregistrement…', add: 'Ajouter', cancel: 'Annuler',
    allTeachers: 'Tous les enseignants', allDays: 'Tous', clear: 'Effacer',
    noSlots: 'Aucun créneau trouvé', noSlotsHint: 'Ajoutez votre premier créneau pour construire le planning',
    noSlotsFilter: 'Essayez d\'ajuster vos filtres',
    slotsCount: ' créneaux', slotOne: ' créneau',
    colTime: 'Horaire', colTeacher: 'Enseignant', colGroup: 'Groupe', colCourse: 'Matière',
    confirmDelete: 'Supprimer ce créneau ?',
    noSlotsDay: 'Aucun créneau pour ce jour',
  },
  en: {
    title: 'Planning', subtitle: ' slots total', subtitleOne: ' slot total',
    addSlot: 'Add Slot', newSlot: 'New Planning Slot',
    teacher: 'Teacher', selectTeacher: 'Select teacher',
    group: 'Group', selectGroup: 'Select group', year: 'Y',
    course: 'Course', selectCourse: 'Select course',
    day: 'Day', startTime: 'Start time', endTime: 'End time',
    errTeacher: 'Please select a teacher.', errGroup: 'Please select a group.',
    errCourse: 'Please select a course.', errTime: 'End time must be after start time.',
    saving: 'Saving…', add: 'Add Slot', cancel: 'Cancel',
    allTeachers: 'All teachers', allDays: 'All', clear: 'Clear',
    noSlots: 'No planning slots found', noSlotsHint: 'Add your first slot to build the schedule',
    noSlotsFilter: 'Try adjusting your filters',
    slotsCount: ' slots', slotOne: ' slot',
    colTime: 'Time', colTeacher: 'Teacher', colGroup: 'Group', colCourse: 'Course',
    confirmDelete: 'Remove this planning slot?',
    noSlotsDay: 'No slots for this day',
  },
  ar: {
    title: 'الجدول الزمني', subtitle: ' خانة إجمالاً', subtitleOne: ' خانة إجمالاً',
    addSlot: 'إضافة خانة', newSlot: 'خانة زمنية جديدة',
    teacher: 'الأستاذ', selectTeacher: 'اختر أستاذاً',
    group: 'الفصل', selectGroup: 'اختر فصلاً', year: 'س',
    course: 'المادة', selectCourse: 'اختر مادة',
    day: 'اليوم', startTime: 'وقت البداية', endTime: 'وقت النهاية',
    errTeacher: 'الرجاء اختيار أستاذ.', errGroup: 'الرجاء اختيار فصل.',
    errCourse: 'الرجاء اختيار مادة.', errTime: 'يجب أن يكون وقت النهاية بعد وقت البداية.',
    saving: 'جارٍ الحفظ…', add: 'إضافة', cancel: 'إلغاء',
    allTeachers: 'جميع الأساتذة', allDays: 'الكل', clear: 'مسح',
    noSlots: 'لا توجد خانات زمنية', noSlotsHint: 'أضف أول خانة لبناء الجدول',
    noSlotsFilter: 'جرّب تعديل الفلاتر',
    slotsCount: ' خانات', slotOne: ' خانة',
    colTime: 'الوقت', colTeacher: 'الأستاذ', colGroup: 'الفصل', colCourse: 'المادة',
    confirmDelete: 'حذف هذه الخانة الزمنية؟',
    noSlotsDay: 'لا توجد خانات لهذا اليوم',
  },
}

const DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DAY_COLORS: Record<Day, string> = {
  Monday:    'bg-blue-500/10   text-blue-400   border-blue-500/20',
  Tuesday:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Wednesday: 'bg-green-500/10  text-green-400  border-green-500/20',
  Thursday:  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Friday:    'bg-pink-500/10   text-pink-400   border-pink-500/20',
  Saturday:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

const EMPTY: AddPlanningPayload = {
  teacher_id: '', group_id: '', course_id: '',
  day: 'Monday', start_time: '08:00', end_time: '09:00',
}

function fmt(t: string) { return t.slice(0, 5) }

export default function PlanningPage() {
  const { slots, teachers, groups, courses, loading, error, fetchSlots, fetchDropdowns, addSlot, updateSlot, deleteSlot } = usePlanningStore()
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [showForm,      setShowForm]      = useState(false)
  const [form,          setForm]          = useState<AddPlanningPayload>(EMPTY)
  const [editId,        setEditId]        = useState<string | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [formError,     setFormError]     = useState('')
  const [activeDay,     setActiveDay]     = useState<Day | 'All'>('All')
  const [filterTeacher, setFilterTeacher] = useState('')

  useEffect(() => { fetchSlots(); fetchDropdowns() }, [fetchSlots, fetchDropdowns])

  const openForm     = () => { setForm(EMPTY); setEditId(null); setFormError(''); setShowForm(true) }
  const handleCancel = () => { setShowForm(false); setForm(EMPTY); setEditId(null); setFormError('') }
  const openEdit     = (slot: TeacherPlanningFull) => {
    setForm({
      teacher_id: slot.teacher_id,
      group_id:   slot.group_id,
      course_id:  slot.course_id,
      day:        slot.day,
      start_time: slot.start_time.slice(0, 5),
      end_time:   slot.end_time.slice(0, 5),
    })
    setEditId(slot.id)
    setFormError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.teacher_id)                    { setFormError(ui.errTeacher); return }
    if (!form.group_id)                      { setFormError(ui.errGroup);   return }
    if (!form.course_id)                     { setFormError(ui.errCourse);  return }
    if (form.start_time >= form.end_time)    { setFormError(ui.errTime);    return }
    setSaving(true); setFormError('')
    if (editId) {
      const ok = await updateSlot(editId, form)
      setSaving(false)
      if (!ok) { const e = usePlanningStore.getState().error; if (e) setFormError(e); return }
      toast.success(lang === 'ar' ? 'تم التعديل' : lang === 'fr' ? 'Créneau modifié' : 'Slot updated')
    } else {
      const id = await addSlot(form)
      setSaving(false)
      if (!id) { const e = usePlanningStore.getState().error; if (e) setFormError(e); return }
      toast.success(lang === 'ar' ? 'تمت الإضافة' : lang === 'fr' ? 'Créneau ajouté' : 'Slot added')
    }
    handleCancel()
  }

  const handleDelete = async (id: string) => {
    await deleteSlot(id)
    toast.success(lang === 'ar' ? 'تم الحذف' : lang === 'fr' ? 'Créneau supprimé' : 'Slot deleted')
  }

  const filtered = slots.filter(s => {
    const matchDay     = activeDay === 'All' || s.day === activeDay
    const matchTeacher = filterTeacher ? s.teacher_id === filterTeacher : true
    return matchDay && matchTeacher
  })

  const byDay = DAYS.reduce<Record<Day, TeacherPlanningFull[]>>((acc, day) => {
    acc[day] = filtered.filter(s => s.day === day); return acc
  }, {} as Record<Day, TeacherPlanningFull[]>)

  const selectCls = `w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
    text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition
    ${isRtl ? 'text-right' : ''}`

  const inputCls = `w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
    text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition`

  const labelCls = `block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`

  return (
    <div className={`max-w-6xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* ── Header ───────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between
        ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {slots.length}{slots.length !== 1 ? ui.subtitle : ui.subtitleOne}
          </p>
        </div>
        <button onClick={openForm}
          className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
            px-4 py-2.5 rounded-xl transition-all w-fit ${isRtl ? 'flex-row-reverse' : ''}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {ui.addSlot}
        </button>
      </div>

      {/* ── Form ─────────────────────────────────────── */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-white mb-4 sm:mb-5">{editId ? (lang === "ar" ? "تعديل الخانة" : lang === "fr" ? "Modifier le créneau" : "Edit Slot") : ui.newSlot}</h3>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

            {/* Row 1: Teacher / Group / Course */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>{ui.teacher} <span className="text-red-400">*</span></label>
                <select value={form.teacher_id}
                  onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}
                  className={selectCls}>
                  <option value="">{ui.selectTeacher}</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{ui.group} <span className="text-red-400">*</span></label>
                <select value={form.group_id}
                  onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}
                  className={selectCls}>
                  <option value="">{ui.selectGroup}</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} — {ui.year}{g.year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{ui.course} <span className="text-red-400">*</span></label>
                <select value={form.course_id}
                  onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
                  className={selectCls}>
                  <option value="">{ui.selectCourse}</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Day / Start / End */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>{ui.day} <span className="text-red-400">*</span></label>
                <select value={form.day}
                  onChange={e => setForm(f => ({ ...f, day: e.target.value as Day }))}
                  className={selectCls}>
                  {DAYS.map(d => (
                    <option key={d} value={d}>{DAY_LABELS[d][lang]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{ui.startTime} <span className="text-red-400">*</span></label>
                <input type="time" value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{ui.endTime} <span className="text-red-400">*</span></label>
                <input type="time" value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className={inputCls} />
              </div>
            </div>

            {formError && (
              <div className={`flex items-center gap-2 bg-red-500/10 border border-red-500/20
                rounded-xl px-4 py-3 text-red-400 text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formError}
              </div>
            )}

            <div className={`flex gap-3 pt-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition">
                {saving ? ui.saving : ui.add}
              </button>
              <button type="button" onClick={handleCancel}
                className="text-slate-400 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-slate-800 transition">
                {ui.cancel}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Global error */}
      {error && !showForm && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {/* ── Filters ──────────────────────────────────── */}
      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        {/* Day tabs — scrollable on mobile */}
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-x-auto max-w-full">
          {(['All', ...DAYS] as (Day | 'All')[]).map((d) => (
            <button key={d} onClick={() => setActiveDay(d)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                ${activeDay === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
              {d === 'All' ? ui.allDays : DAY_LABELS[d][lang]}
            </button>
          ))}
        </div>

        {/* Teacher filter */}
        <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
          className={`bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isRtl ? 'text-right' : ''}`}>
          <option value="">{ui.allTeachers}</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {filterTeacher && (
          <button onClick={() => setFilterTeacher('')}
            className="text-xs text-slate-500 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition">
            {ui.clear}
          </button>
        )}
      </div>

      {/* ── Timetable ────────────────────────────────── */}
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">{ui.noSlots}</p>
          <p className="text-slate-600 text-sm mt-1">
            {slots.length === 0 ? ui.noSlotsHint : ui.noSlotsFilter}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {(activeDay === 'All' ? DAYS : [activeDay as Day]).map((day) => {
            const daySlots = byDay[day]
            if (activeDay === 'All' && daySlots.length === 0) return null

            return (
              <div key={day} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Day header */}
                <div className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 border-b border-slate-800
                  ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${DAY_COLORS[day]}`}>
                    {DAY_LABELS[day][lang]}
                  </span>
                  <span className="text-xs text-slate-500">
                    {daySlots.length}{daySlots.length !== 1 ? ui.slotsCount : ui.slotOne}
                  </span>
                </div>

                {daySlots.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-600 text-center">{ui.noSlotsDay}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800/60">
                          {[ui.colTime, ui.colTeacher, ui.colGroup, ui.colCourse, ''].map((h, i) => (
                            <th key={i}
                              className={`px-4 sm:px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider
                                ${i === 4 ? '' : isRtl ? 'text-right' : 'text-left'}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {daySlots.map((slot) => (
                          <tr key={slot.id} className="hover:bg-slate-800/30 transition group">
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <span className="text-xs sm:text-sm font-mono text-slate-300 whitespace-nowrap">
                                {fmt(slot.start_time)} – {fmt(slot.end_time)}
                              </span>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-green-400">
                                    {slot.profiles.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-xs sm:text-sm text-white">{slot.profiles.name}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2 py-1 rounded-lg whitespace-nowrap">
                                {slot.groups.name}
                                <span className="text-slate-500 ml-1">{ui.year}{slot.groups.year}</span>
                              </span>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <span className="text-xs sm:text-sm text-slate-300">{slot.courses.name}</span>
                            </td>
                            <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                              <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition
                                ${isRtl ? 'justify-start' : 'justify-end'}`}>
                                <button onClick={() => openEdit(slot)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button onClick={() => handleDelete(slot.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
