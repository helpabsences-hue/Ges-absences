'use client'
// src/app/teacher/_shell.tsx

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore }    from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

const ROLE_LABEL: Record<string, Record<string, string>> = {
  fr: { teacher: 'Enseignant' },
  en: { teacher: 'Teacher'    },
  ar: { teacher: 'أستاذ'      },
}

export default function TeacherShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { profile, fetchProfile, signOut } = useAuthStore()
  const { language } = useSettingsStore()
  const lang = (language || 'fr') as string
  const roleLabel = ROLE_LABEL[lang]?.teacher ?? 'Enseignant'

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* ── Top bar ───────────────────────────────────── */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">

        {/* Logo + school */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">
              Attend<span className="text-blue-400">ify</span>
            </span>
            {profile && (
              <span className="text-slate-500 text-sm ml-2">
                — {profile.schools.name}
              </span>
            )}
          </div>
        </div>

        {/* User + sign-out */}
        {profile && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white leading-tight">
                {profile.name}
              </p>
              <span className="text-xs text-green-400 font-medium">{roleLabel}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-green-400">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-1 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* ── Page content ──────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}