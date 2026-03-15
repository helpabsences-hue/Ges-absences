'use client'
// app/teacher/_shell.tsx

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/stores/useAuthStore'
import { LogoIcon } from '@/components/shared/LogoIcon'

export default function TeacherShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { profile, fetchProfile, signOut } = useAuthStore()

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-1">
          <div className="p-1">
            {/* Use the SVG Component here */}
            <LogoIcon className="w-9 h-9" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">
              Attend<span className="text-blue-400">ify</span>
            </span>
            {profile && (
              <span className="text-slate-500 text-sm ml-2">— {profile.schools?.name}</span>
            )}
          </div>
        </div>

        {/* Right side: settings + profile + sign-out */}
        {profile && (
          <div className="flex items-center gap-2">

            {/* Settings icon */}
            <Link href="/teacher/settings"
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-blue-800 transition-all"
              title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            {/* Profile */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white leading-tight">{profile.name}</p>
                <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-md">
                  Teacher
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-green-400">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Sign out */}
            <button onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign out">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
