'use client'
// app/dashboard/_shell.tsx

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import Sidebar from '@/components/shared/Sidebar'
import Header  from '@/components/shared/Header'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const fetchProfile = useAuthStore((s) => s.fetchProfile)
  useEffect(() => { fetchProfile() }, [fetchProfile])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar — desktop only (mobile is a fixed drawer inside Sidebar) */}
      <Sidebar />

      {/* Right column */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        {/* pt-0 on md+ (no hamburger), extra top padding on mobile so content clears the hamburger button */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
