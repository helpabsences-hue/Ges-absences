'use client'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'
// app/dashboard/groups/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { useGroupStore }    from '@/stores/useGroupStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { createClient }     from '@/lib/supabase/client'
import type { GroupWithField, AddGroupPayload } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string; subtitleOne: string
  addGroup: string; editGroup: string; newGroup: string
  groupName: string; groupNamePlaceholder: string
  academicYear: string; field: string; none: string
  students: string; autoCalc: string
  errName: string; errYear: string
  saving: string; update: string; add: string; cancel: string
  searchPlaceholder: string
  colName: string; colYear: string; colField: string; colStudents: string
  noMatch: string; noGroups: string; noGroupsHint: string
  confirmDelete: string; studentsLabel: string
}> = {
  fr: {
    title: 'Groupes', subtitle: ' groupes enregistrés', subtitleOne: ' groupe enregistré',
    addGroup: 'Ajouter un Groupe', editGroup: 'Modifier le Groupe', newGroup: 'Nouveau Groupe',
    groupName: 'Nom du groupe', groupNamePlaceholder: 'ex. 2BAC-A',
    academicYear: 'Année scolaire', field: 'Filière', none: 'Aucune',
    students: 'Étudiants', autoCalc: 'Calculé automatiquement',
    errName: 'Le nom est obligatoire.', errYear: "L'année est obligatoire.",
    saving: 'Enregistrement…', update: 'Modifier', add: 'Ajouter', cancel: 'Annuler',
    searchPlaceholder: 'Rechercher des groupes…',
    colName: 'Nom', colYear: 'Année', colField: 'Filière', colStudents: 'Étudiants',
    noMatch: 'Aucun groupe ne correspond', noGroups: 'Aucun groupe pour le moment',
    noGroupsHint: 'Ajoutez votre premier groupe pour commencer',
    confirmDelete: 'Supprimer ce groupe ? Les étudiants assignés perdront leur groupe.',
    studentsLabel: 'étudiants',
  },
  en: {
    title: 'Groups', subtitle: ' groups registered', subtitleOne: ' group registered',
    addGroup: 'Add Group', editGroup: 'Edit Group', newGroup: 'New Group',
    groupName: 'Group name', groupNamePlaceholder: 'e.g. 2BAC-A',
    academicYear: 'Academic year', field: 'Field', none: 'None',
    students: 'Students', autoCalc: 'Auto-calculated from enrolled students',
    errName: 'Name is required.', errYear: 'Year is required.',
    saving: 'Saving…', update: 'Update Group', add: 'Add Group', cancel: 'Cancel',
    searchPlaceholder: 'Search groups…',
    colName: 'Name', colYear: 'Year', colField: 'Field', colStudents: 'Students',
    noMatch: 'No groups match your search', noGroups: 'No groups yet',
    noGroupsHint: 'Add your first group to get started',
    confirmDelete: 'Delete this group? Students assigned to it will lose their group.',
    studentsLabel: 'students',
  },
  ar: {
    title: 'الفصول', subtitle: ' فصل مسجل', subtitleOne: ' فصل مسجل',
    addGroup: 'إضافة فصل', editGroup: 'تعديل الفصل', newGroup: 'فصل جديد',
    groupName: 'اسم الفصل', groupNamePlaceholder: 'مثال: 2BAC-A',
    academicYear: 'السنة الدراسية', field: 'الشُّعبة', none: 'لا شيء',
    students: 'الطلاب', autoCalc: 'يُحسب تلقائياً من الطلاب المسجلين',
    errName: 'الاسم مطلوب.', errYear: 'السنة مطلوبة.',
    saving: 'جارٍ الحفظ…', update: 'تعديل', add: 'إضافة', cancel: 'إلغاء',
    searchPlaceholder: 'البحث في الفصول…',
    colName: 'الاسم', colYear: 'السنة', colField: 'الشُّعبة', colStudents: 'الطلاب',
    noMatch: 'لا يوجد فصل يطابق البحث', noGroups: 'لا توجد فصول بعد',
    noGroupsHint: 'أضف أول فصل للبدء',
    confirmDelete: 'حذف هذا الفصل؟ سيفقد الطلاب المنتسبون إليه فصلهم.',
    studentsLabel: 'طالب',
  },
}

const CURRENT_YEAR = new Date().getFullYear()
const EMPTY: AddGroupPayload = { name: '', year: CURRENT_YEAR, field_id: null, number_student: null }

const YEAR_COLORS = [
  'bg-blue-500/10 text-blue-400',
  'bg-purple-500/10 text-purple-400',
  'bg-green-500/10 text-green-400',
  'bg-orange-500/10 text-orange-400',
  'bg-pink-500/10 text-pink-400',
]

export default function GroupsPage() {
  const { groups, fields, loading, error, fetchGroups, fetchFields, addGroup, updateGroup, deleteGroup } = useGroupStore()
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<AddGroupPayload>(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [search,    setSearch]    = useState('')
  const [counts,    setCounts]    = useState<Record<string, number>>({})

  const fetchCounts = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('students').select('group_id')
    if (!data) return
    const map: Record<string, number> = {}
    data.forEach((s: any) => { if (s.group_id) map[s.group_id] = (map[s.group_id] ?? 0) + 1 })
    setCounts(map)
  }, [])

  useEffect(() => {
    fetchGroups(); fetchFields(); fetchCounts()
    const supabase = createClient()
    const channel = supabase
      .channel('students-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchCounts)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchGroups, fetchFields, fetchCounts])

  const openAdd  = () => { setEditId(null); setForm(EMPTY); setFormError(''); setShowForm(true) }
  const openEdit = (g: GroupWithField) => {
    setEditId(g.id); setForm({ name: g.name, year: g.year, field_id: g.field_id, number_student: g.number_student })
    setFormError(''); setShowForm(true)
  }
  const handleCancel = () => { setShowForm(false); setEditId(null); setForm(EMPTY); setFormError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError(ui.errName); return }
    if (!form.year)        { setFormError(ui.errYear); return }
    setSaving(true); setFormError('')
    if (editId) { await updateGroup(editId, form) } else { await addGroup(form) }
    setSaving(false); handleCancel()
  }

  const handleDelete = async (id: string) => {
        await deleteGroup(id)
  }

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))

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
            {groups.length}{groups.length !== 1 ? ui.subtitle : ui.subtitleOne}
          </p>
        </div>
        <button onClick={openAdd}
          className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
            px-4 py-2.5 rounded-xl transition-all w-fit ${isRtl ? 'flex-row-reverse' : ''}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {ui.addGroup}
        </button>
      </div>

      {/* ── Form ───────────────────────────────────────── */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            {editId ? ui.editGroup : ui.newGroup}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.groupName} <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={ui.groupNamePlaceholder} className={inputCls} />
              </div>

              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.academicYear} <span className="text-red-400">*</span>
                </label>
                <input type="number" min={2000} max={2100} value={form.year}
                  onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                  placeholder={`${CURRENT_YEAR}`} className={inputCls} />
              </div>

              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.field}
                </label>
                <select value={form.field_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, field_id: e.target.value || null }))}
                  className={inputCls}>
                  <option value="">{ui.none}</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                  {ui.students}
                </label>
                <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-500 italic">
                  {ui.autoCalc}
                </div>
              </div>
            </div>

            {formError && <p className="text-xs text-red-400">{formError}</p>}
            {error     && <p className="text-xs text-red-400">{error}</p>}

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
            <p className="text-slate-400 font-medium">{search ? ui.noMatch : ui.noGroups}</p>
            {!search && <p className="text-slate-600 text-sm mt-1">{ui.noGroupsHint}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {[ui.colName, ui.colYear, ui.colField, ui.colStudents, ''].map((h, i) => (
                    <th key={i}
                      className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider
                        ${i === 4 ? '' : isRtl ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((group) => (
                  <tr key={group.id} className="hover:bg-slate-800/40 transition group">
                    <td className="px-4 sm:px-5 py-4">
                      <span className="text-sm font-semibold text-white">{group.name}</span>
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg
                        ${YEAR_COLORS[group.year % YEAR_COLORS.length]}`}>
                        {group.year}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      {group.fields
                        ? <span className="text-sm text-slate-300">{group.fields.name}</span>
                        : <span className="text-slate-600 text-sm">—</span>
                      }
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      <div className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-semibold text-white">{counts[group.id] ?? 0}</span>
                        <span className="text-xs text-slate-500">{ui.studentsLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition
                        ${isRtl ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                        <button onClick={() => openEdit(group)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(group.id)}
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
    </div>
  )
}
