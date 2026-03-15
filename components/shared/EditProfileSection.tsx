'use client'
// components/shared/EditProfileSection.tsx

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

type Lang = 'fr' | 'en' | 'ar'

const UI: Record<Lang, {
  title: string; desc: string
  nameLabel: string; emailLabel: string; roleLabel: string
  editBtn: string; saveBtn: string; saving: string; cancelBtn: string
  namePlaceholder: string
  savedMsg: string; errEmpty: string
}> = {
  fr: {
    title: 'Compte', desc: 'Modifiez vos informations personnelles',
    nameLabel: 'Nom complet', emailLabel: 'Email', roleLabel: 'Rôle',
    editBtn: 'Modifier', saveBtn: 'Enregistrer', saving: 'Enregistrement…', cancelBtn: 'Annuler',
    namePlaceholder: 'Votre nom complet',
    savedMsg: 'Nom mis à jour !', errEmpty: 'Le nom ne peut pas être vide.',
  },
  en: {
    title: 'Account', desc: 'Update your personal information',
    nameLabel: 'Full name', emailLabel: 'Email', roleLabel: 'Role',
    editBtn: 'Edit', saveBtn: 'Save', saving: 'Saving…', cancelBtn: 'Cancel',
    namePlaceholder: 'Your full name',
    savedMsg: 'Name updated!', errEmpty: 'Name cannot be empty.',
  },
  ar: {
    title: 'الحساب', desc: 'تعديل معلوماتك الشخصية',
    nameLabel: 'الاسم الكامل', emailLabel: 'البريد الإلكتروني', roleLabel: 'الدور',
    editBtn: 'تعديل', saveBtn: 'حفظ', saving: 'جارٍ الحفظ…', cancelBtn: 'إلغاء',
    namePlaceholder: 'اسمك الكامل',
    savedMsg: 'تم تحديث الاسم!', errEmpty: 'لا يمكن أن يكون الاسم فارغاً.',
  },
}

const ROLE_LABELS: Record<Lang, Record<string, string>> = {
  fr: { super_admin: 'Super Admin', admin: 'Administrateur', teacher: 'Enseignant' },
  en: { super_admin: 'Super Admin', admin: 'Administrator',  teacher: 'Teacher'    },
  ar: { super_admin: 'مدير عام',    admin: 'مدير',           teacher: 'أستاذ'      },
}

export default function EditProfileSection({ lang = 'en' }: { lang?: Lang }) {
  const { profile, fetchProfile } = useAuthStore()
  const ui    = UI[lang]
  const isRtl = lang === 'ar'

  const [editing, setEditing] = useState(false)
  const [name,    setName]    = useState(profile?.name ?? '')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  if (!profile) return null

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError(ui.errEmpty); return }
    setSaving(true)
    setError('')

    try {
      const supabase = createClient()

      // Try updating profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ name: trimmed })
        .eq('id', profile.id)

      if (dbError) {
        console.error('DB update error:', dbError)
        // If RLS blocks it, try via auth metadata as fallback
        const { error: metaError } = await supabase.auth.updateUser({
          data: { full_name: trimmed }
        })
        if (metaError) {
          console.error('Auth meta error:', metaError)
          setError(dbError.message)
          setSaving(false)
          return
        }
      }

      // Update store immediately without waiting for full refetch
      useAuthStore.setState(state => ({
        profile: state.profile ? { ...state.profile, name: trimmed } : null
      }))

      // Also do a full refetch to sync
      await fetchProfile()

      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError(String(err?.message ?? err))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(profile.name)
    setEditing(false)
    setError('')
  }

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
      <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div>
          <h3 className="text-sm font-semibold text-white">{ui.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{ui.desc}</p>
        </div>
        {success && (
          <div className={`flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10
            border border-green-500/20 px-3 py-1.5 rounded-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {ui.savedMsg}
          </div>
        )}
      </div>

      <div className="space-y-0">

        {/* Name row */}
        <div className={`flex items-center justify-between py-3 border-b border-slate-800
          gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider shrink-0 w-20">
            {ui.nameLabel}
          </span>

          {editing ? (
            <div className={`flex items-center gap-2 flex-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder={ui.namePlaceholder}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                className={`flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2
                  text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${isRtl ? 'text-right' : ''}`}
              />
              <button onClick={handleSave} disabled={saving}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                  text-white px-3 py-2 rounded-xl transition shrink-0">
                {saving ? ui.saving : ui.saveBtn}
              </button>
              <button onClick={handleCancel}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-2 rounded-xl
                  hover:bg-slate-800 transition shrink-0">
                {ui.cancelBtn}
              </button>
            </div>
          ) : (
            <div className={`flex items-center gap-3 flex-1 justify-end ${isRtl ? 'flex-row-reverse justify-start' : ''}`}>
              <span className="text-sm text-white font-medium">{profile.name}</span>
              <button onClick={() => { setName(profile.name); setEditing(true) }}
                className={`flex items-center gap-1 text-xs text-slate-500 hover:text-blue-400
                  hover:bg-blue-500/10 px-2 py-1.5 rounded-lg transition shrink-0
                  ${isRtl ? 'flex-row-reverse' : ''}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {ui.editBtn}
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400 pt-1 pb-1">{error}</p>}

        {/* Email */}
        <div className={`flex items-center justify-between py-3 border-b border-slate-800
          ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-20">{ui.emailLabel}</span>
          <span className="text-sm text-white font-medium truncate max-w-[250px]">{profile.email}</span>
        </div>

        {/* Role */}
        <div className={`flex items-center justify-between py-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider w-20">{ui.roleLabel}</span>
          <span className="text-sm text-white font-medium">
            {ROLE_LABELS[lang][profile.role] ?? profile.role}
          </span>
        </div>

      </div>
    </section>
  )
}
