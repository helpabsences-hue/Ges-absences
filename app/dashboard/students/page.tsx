'use client'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'
// app/dashboard/students/page.tsx

import { useEffect, useState } from 'react'
import { useStudentStore } from '@/stores/useStudentStore'
import { useGroupStore }   from '@/stores/useGroupStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { StudentWithGroup, AddStudentPayload } from '@/types'
import BulkStudentUpload from '@/components/dashboard/BulkStudentUpload'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string; subtitleOne: string
  importCsv: string; addStudent: string
  importTitle: string; importDesc: string
  editStudent: string; newStudent: string
  fullName: string; fullNamePlaceholder: string
  massarCode: string; massarPlaceholder: string
  group: string; selectGroup: string; year: string
  errName: string; errMassar: string; errGroup: string
  saving: string; update: string; add: string; cancel: string
  searchPlaceholder: string; allGroups: string; clearFilters: string
  colName: string; colMassar: string; colGroup: string
  unassigned: string; noMatch: string; noStudents: string
  noStudentsHint: string; showing: string; of: string
  confirmDelete: string
}> = {
  fr: {
    title: 'Étudiants', subtitle: ' étudiants inscrits', subtitleOne: ' étudiant inscrit',
    importCsv: 'Importer CSV', addStudent: 'Ajouter un Étudiant',
    importTitle: 'Importer des Étudiants via CSV', importDesc: 'Ajout en masse depuis un export tableur',
    editStudent: 'Modifier l\'Étudiant', newStudent: 'Nouvel Étudiant',
    fullName: 'Nom complet', fullNamePlaceholder: 'Nom complet de l\'étudiant',
    massarCode: 'Code Massar', massarPlaceholder: 'ex. G123456789',
    group: 'Groupe', selectGroup: 'Choisir un groupe', year: 'Année',
    errName: 'Le nom est obligatoire.', errMassar: 'Le code Massar est obligatoire.', errGroup: 'Veuillez choisir un groupe.',
    saving: 'Enregistrement…', update: 'Modifier', add: 'Ajouter', cancel: 'Annuler',
    searchPlaceholder: 'Rechercher nom ou Massar…', allGroups: 'Tous les groupes', clearFilters: 'Effacer les filtres',
    colName: 'Nom', colMassar: 'Code Massar', colGroup: 'Groupe',
    unassigned: 'Non assigné', noMatch: 'Aucun étudiant ne correspond', noStudents: 'Aucun étudiant pour le moment',
    noStudentsHint: 'Ajoutez manuellement ou importez un fichier CSV',
    showing: 'Affichage de', of: 'sur',
    confirmDelete: 'Supprimer cet étudiant ?',
  },
  en: {
    title: 'Students', subtitle: ' students registered', subtitleOne: ' student registered',
    importCsv: 'Import CSV', addStudent: 'Add Student',
    importTitle: 'Import Students via CSV', importDesc: 'Bulk-add students from a spreadsheet export',
    editStudent: 'Edit Student', newStudent: 'New Student',
    fullName: 'Full name', fullNamePlaceholder: 'Student full name',
    massarCode: 'Massar code', massarPlaceholder: 'e.g. G123456789',
    group: 'Group', selectGroup: 'Select group', year: 'Year',
    errName: 'Name is required.', errMassar: 'Massar code is required.', errGroup: 'Please select a group.',
    saving: 'Saving…', update: 'Update Student', add: 'Add Student', cancel: 'Cancel',
    searchPlaceholder: 'Search name or Massar…', allGroups: 'All groups', clearFilters: 'Clear filters',
    colName: 'Name', colMassar: 'Massar Code', colGroup: 'Group',
    unassigned: 'Unassigned', noMatch: 'No students match your filters', noStudents: 'No students yet',
    noStudentsHint: 'Add one manually or import a CSV file',
    showing: 'Showing', of: 'of',
    confirmDelete: 'Delete this student?',
  },
  ar: {
    title: 'الطلاب', subtitle: ' طالب مسجل', subtitleOne: ' طالب مسجل',
    importCsv: 'استيراد CSV', addStudent: 'إضافة طالب',
    importTitle: 'استيراد الطلاب عبر CSV', importDesc: 'إضافة جماعية من ملف جدول بيانات',
    editStudent: 'تعديل الطالب', newStudent: 'طالب جديد',
    fullName: 'الاسم الكامل', fullNamePlaceholder: 'الاسم الكامل للطالب',
    massarCode: 'رمز مسار', massarPlaceholder: 'مثال: G123456789',
    group: 'الفصل', selectGroup: 'اختر الفصل', year: 'السنة',
    errName: 'الاسم مطلوب.', errMassar: 'رمز مسار مطلوب.', errGroup: 'الرجاء اختيار فصل.',
    saving: 'جارٍ الحفظ…', update: 'تعديل', add: 'إضافة', cancel: 'إلغاء',
    searchPlaceholder: 'البحث بالاسم أو رمز مسار…', allGroups: 'جميع الفصول', clearFilters: 'مسح الفلاتر',
    colName: 'الاسم', colMassar: 'رمز مسار', colGroup: 'الفصل',
    unassigned: 'غير مسند', noMatch: 'لا يوجد طالب يطابق الفلتر', noStudents: 'لا يوجد طلاب بعد',
    noStudentsHint: 'أضف يدوياً أو استورد ملف CSV',
    showing: 'عرض', of: 'من',
    confirmDelete: 'حذف هذا الطالب؟',
  },
}

const EMPTY: AddStudentPayload = { name: '', massar_code: '', group_id: '' }

export default function StudentsPage() {
  const { students, loading, error, fetchStudents, addStudent, updateStudent, deleteStudent } = useStudentStore()
  const { groups, fetchGroups } = useGroupStore()
  const { language }            = useSettingsStore()
  const lang   = (language || 'fr') as Lang
  const ui     = UI[lang]
  const isRtl  = lang === 'ar'

  const [showForm,    setShowForm]    = useState(false)
  const [showUpload,  setShowUpload]  = useState(false)
  const [form,        setForm]        = useState<AddStudentPayload>(EMPTY)
  const [saving,      setSaving]      = useState(false)
  const [editId,      setEditId]      = useState<string | null>(null)
  const [formError,   setFormError]   = useState('')
  const [search,      setSearch]      = useState('')
  const [filterGroup, setFilterGroup] = useState('')

  useEffect(() => { fetchStudents(); fetchGroups() }, [fetchStudents, fetchGroups])

  const openAdd = () => { setShowUpload(false); setEditId(null); setForm(EMPTY); setFormError(''); setShowForm(true) }
  const openEdit = (s: StudentWithGroup) => {
    setShowUpload(false); setEditId(s.id)
    setForm({ name: s.name, massar_code: s.massar_code, group_id: s.group_id ?? '' })
    setFormError(''); setShowForm(true)
  }
  const handleCancel = () => { setShowForm(false); setEditId(null); setForm(EMPTY); setFormError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())        { setFormError(ui.errName);  return }
    if (!form.massar_code.trim()) { setFormError(ui.errMassar); return }
    if (!form.group_id)           { setFormError(ui.errGroup);  return }
    setSaving(true); setFormError('')
    if (editId) { await updateStudent(editId, form) }
    else { const id = await addStudent(form); if (!id) { setSaving(false); return } }
    setSaving(false); handleCancel()
  }

  const handleDelete = async (id: string) => {
        await deleteStudent(id)
  }

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.massar_code.toLowerCase().includes(search.toLowerCase())
    return matchSearch && (filterGroup ? s.group_id === filterGroup : true)
  })

  const inputCls = `w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
    text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
    ${isRtl ? 'text-right' : ''}`

  return (
    <div className={`max-w-5xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between
        ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {students.length}{students.length !== 1 ? ui.subtitle : ui.subtitleOne}
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {/* Import CSV */}
          <button onClick={() => { setShowUpload(v => !v); setShowForm(false) }}
            className={`flex items-center gap-2 text-sm font-medium px-3 sm:px-4 py-2.5 rounded-xl border transition-all
              ${isRtl ? 'flex-row-reverse' : ''}
              ${showUpload
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="hidden sm:inline">{ui.importCsv}</span>
          </button>
          {/* Add */}
          <button onClick={openAdd}
            className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
              px-3 sm:px-4 py-2.5 rounded-xl transition-all ${isRtl ? 'flex-row-reverse' : ''}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{ui.addStudent}</span>
          </button>
        </div>
      </div>

      {/* ── CSV Upload panel ───────────────────────────── */}
      {showUpload && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5">
          <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={isRtl ? 'text-right' : ''}>
              <h3 className="text-sm font-semibold text-white">{ui.importTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{ui.importDesc}</p>
            </div>
            <button onClick={() => setShowUpload(false)}
              className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <BulkStudentUpload />
        </div>
      )}

      {/* ── Add / Edit form ────────────────────────────── */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            {editId ? ui.editStudent : ui.newStudent}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.fullName} <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={ui.fullNamePlaceholder} className={inputCls} />
              </div>
              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.massarCode} <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.massar_code}
                  onChange={(e) => setForm(f => ({ ...f, massar_code: e.target.value.toUpperCase() }))}
                  placeholder={ui.massarPlaceholder}
                  className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.group} <span className="text-red-400">*</span>
                </label>
                <select value={form.group_id}
                  onChange={(e) => setForm(f => ({ ...f, group_id: e.target.value }))}
                  className={inputCls}>
                  <option value="">{ui.selectGroup}</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({ui.year} {g.year})</option>
                  ))}
                </select>
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

      {/* ── Filters ────────────────────────────────────── */}
      <div className={`flex flex-wrap gap-2 sm:gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="relative">
          <svg className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500
            ${isRtl ? 'right-3' : 'left-3'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={ui.searchPlaceholder}
            className={`bg-slate-900 border border-slate-800 rounded-xl py-2.5 text-sm text-white
              placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
              w-48 sm:w-64 ${isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3'}`} />
        </div>
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}
          className={`bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isRtl ? 'text-right' : ''}`}>
          <option value="">{ui.allGroups}</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {(search || filterGroup) && (
          <button onClick={() => { setSearch(''); setFilterGroup('') }}
            className="text-xs text-slate-500 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition">
            {ui.clearFilters}
          </button>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">
              {search || filterGroup ? ui.noMatch : ui.noStudents}
            </p>
            {!search && !filterGroup && (
              <p className="text-slate-600 text-sm mt-1">{ui.noStudentsHint}</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {[ui.colName, ui.colMassar, ui.colGroup, ''].map((h, i) => (
                    <th key={i}
                      className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider
                        ${i === 3 ? '' : isRtl ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition group">
                    <td className="px-4 sm:px-5 py-3 sm:py-4">
                      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-slate-300">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-white">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3 sm:py-4">
                      <span className="text-sm text-slate-400 font-mono">{student.massar_code}</span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 sm:py-4">
                      {student.groups
                        ? <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2 py-1 rounded-lg">{student.groups.name}</span>
                        : <span className="text-slate-600 text-sm">{ui.unassigned}</span>
                      }
                    </td>
                    <td className="px-4 sm:px-5 py-3 sm:py-4">
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition
                        ${isRtl ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                        <button onClick={() => openEdit(student)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(student.id)}
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

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className={`text-xs text-slate-600 ${isRtl ? 'text-left' : 'text-right'}`}>
          {ui.showing} {filtered.length} {ui.of} {students.length}
        </p>
      )}
    </div>
  )
}
