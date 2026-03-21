'use client'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'
// app/dashboard/fields/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { useGroupStore }    from '@/stores/useGroupStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { createClient }     from '@/lib/supabase/client'
import type { Field, AddFieldPayload } from '@/types'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; subtitle: string
  addField: string; editField: string; newField: string
  fieldName: string; fieldPlaceholder: string
  errName: string; saving: string; update: string; add: string; cancel: string
  groups: string; groupOne: string; noGroups: string
  noFields: string; noFieldsHint: string
  confirmDelete: string
}> = {
  fr: {
    title: 'Filières', subtitle: 'Filières de spécialisation et leurs groupes',
    addField: 'Ajouter une Filière', editField: 'Modifier la Filière', newField: 'Nouvelle Filière',
    fieldName: 'Nom de la filière', fieldPlaceholder: 'ex. Sciences Physiques',
    errName: 'Le nom est obligatoire.',
    saving: 'Enregistrement…', update: 'Modifier', add: 'Ajouter', cancel: 'Annuler',
    groups: ' groupes', groupOne: ' groupe', noGroups: 'Aucun groupe assigné',
    noFields: 'Aucune filière pour le moment', noFieldsHint: 'Ajoutez votre première filière de spécialisation',
    confirmDelete: 'Supprimer cette filière ? Tous les groupes liés perdront leur filière.',
  },
  en: {
    title: 'Fields', subtitle: 'Specialization fields and their groups',
    addField: 'Add Field', editField: 'Edit Field', newField: 'New Field',
    fieldName: 'Field name', fieldPlaceholder: 'e.g. Sciences Physiques',
    errName: 'Name is required.',
    saving: 'Saving…', update: 'Update Field', add: 'Add Field', cancel: 'Cancel',
    groups: ' groups', groupOne: ' group', noGroups: 'No groups assigned yet',
    noFields: 'No fields yet', noFieldsHint: 'Add your first specialization field',
    confirmDelete: 'Delete this field? All linked groups will lose their field assignment.',
  },
  ar: {
    title: 'الشُّعَب', subtitle: 'شُعَب التخصص وفصولها',
    addField: 'إضافة شُعبة', editField: 'تعديل الشُّعبة', newField: 'شُعبة جديدة',
    fieldName: 'اسم الشُّعبة', fieldPlaceholder: 'مثال: علوم فيزيائية',
    errName: 'الاسم مطلوب.',
    saving: 'جارٍ الحفظ…', update: 'تعديل', add: 'إضافة', cancel: 'إلغاء',
    groups: ' فصول', groupOne: ' فصل', noGroups: 'لا توجد فصول مسندة بعد',
    noFields: 'لا توجد شُعَب بعد', noFieldsHint: 'أضف أول شُعبة تخصص',
    confirmDelete: 'حذف هذه الشُّعبة؟ ستفقد جميع الفصول المرتبطة بها شُعبتها.',
  },
}

const EMPTY: AddFieldPayload = { name: '', number_groups: null }
interface GroupInfo { id: string; name: string; year: number }

export default function FieldsPage() {
  const { fields, loading, error, fetchFields, addField, updateField, deleteField } = useGroupStore()
  const { language } = useSettingsStore()
  const lang  = (language || 'fr') as Lang
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<AddFieldPayload>(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [groupMap,  setGroupMap]  = useState<Record<string, GroupInfo[]>>({})

  const fetchGroupMap = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('groups').select('id, name, year, field_id').order('name')
    if (!data) return
    const map: Record<string, GroupInfo[]> = {}
    data.forEach((g: any) => {
      if (!g.field_id) return
      if (!map[g.field_id]) map[g.field_id] = []
      map[g.field_id].push({ id: g.id, name: g.name, year: g.year })
    })
    setGroupMap(map)
  }, [])

  useEffect(() => {
    fetchFields(); fetchGroupMap()
    const supabase = createClient()
    const channel = supabase
      .channel('groups-by-field')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, fetchGroupMap)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchFields, fetchGroupMap])

  const openAdd  = () => { setEditId(null); setForm(EMPTY); setFormError(''); setShowForm(true) }
  const openEdit = (f: Field) => {
    setEditId(f.id); setForm({ name: f.name, number_groups: f.number_groups })
    setFormError(''); setShowForm(true)
  }
  const handleCancel = () => { setShowForm(false); setEditId(null); setForm(EMPTY); setFormError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError(ui.errName); return }
    setSaving(true); setFormError('')
    if (editId) { await updateField(editId, form) } else { await addField(form) }
    setSaving(false); handleCancel()
  }

  const handleDelete = async (id: string) => {
        await deleteField(id)
  }

  return (
    <div className={`max-w-3xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between
        ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{ui.subtitle}</p>
        </div>
        <button onClick={openAdd}
          className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium
            px-4 py-2.5 rounded-xl transition-all w-fit ${isRtl ? 'flex-row-reverse' : ''}`}>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {ui.addField}
        </button>
      </div>

      {/* ── Form ───────────────────────────────────────── */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            {editId ? ui.editField : ui.newField}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>
                {ui.fieldName} <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={ui.fieldPlaceholder}
                className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm
                  text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${isRtl ? 'text-right' : ''}`} />
            </div>

            {formError && <p className="text-xs text-red-400">{formError}</p>}
            {error     && <p className="text-xs text-red-400">{error}</p>}

            <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
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

      {/* ── Cards ──────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : fields.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-16 text-center">
          <p className="text-slate-400 font-medium">{ui.noFields}</p>
          <p className="text-slate-600 text-sm mt-1">{ui.noFieldsHint}</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {fields.map((field) => {
            const fieldGroups = groupMap[field.id] ?? []
            return (
              <div key={field.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition group">
                <div className={`flex items-start gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>

                  {/* Field name + group chips */}
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 mb-2 sm:mb-3 flex-wrap
                      ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <h3 className="text-sm font-semibold text-white">{field.name}</h3>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                        {fieldGroups.length}{fieldGroups.length !== 1 ? ui.groups : ui.groupOne}
                      </span>
                    </div>

                    {fieldGroups.length > 0 ? (
                      <div className={`flex flex-wrap gap-1.5 sm:gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        {fieldGroups.map((g) => (
                          <span key={g.id}
                            className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400
                              border border-blue-500/20 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-medium">
                            {g.name}
                            <span className="text-blue-400/50 text-[10px]">{g.year}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic">{ui.noGroups}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button onClick={() => openEdit(field)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(field.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
