'use client'
// components/shared/Sidebar.tsx

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { Role } from '@/types'
import { LogoIcon } from './LogoIcon'

// ── Simple inline translations — no t() dependency ────────
type Lang = 'fr' | 'en' | 'ar'

const NAV_LABELS: Record<string, Record<Lang, string>> = {
  '/dashboard': { fr: 'Tableau de Bord', en: 'Dashboard', ar: 'لوحة التحكم' },
  '/dashboard/teachers': { fr: 'Enseignants', en: 'Teachers', ar: 'الأساتذة' },
  '/dashboard/students': { fr: 'Étudiants', en: 'Students', ar: 'الطلاب' },
  '/dashboard/groups': { fr: 'Groupes', en: 'Groups', ar: 'الفصول' },
  '/dashboard/fields': { fr: 'Filières', en: 'Fields', ar: 'الشُّعَب' },
  '/dashboard/courses': { fr: 'Matières', en: 'Courses', ar: 'المواد' },
  '/dashboard/planning': { fr: 'Planning', en: 'Planning', ar: 'الجدول الزمني' },
  '/dashboard/reports': { fr: 'Rapports', en: 'Reports', ar: 'التقارير' },
  '/dashboard/invitations': { fr: 'Invitations', en: 'Invitations', ar: 'الدعوات' },
  '/dashboard/settings': { fr: 'Paramètres', en: 'Settings', ar: 'الإعدادات' },
}

const UI: Record<Lang, { school: string; signOut: string }> = {
  fr: { school: 'École', signOut: 'Déconnexion' },
  en: { school: 'School', signOut: 'Sign out' },
  ar: { school: 'المدرسة', signOut: 'تسجيل الخروج' },
}

// ── Nav items ─────────────────────────────────────────────
interface NavItem { href: string; roles: Role[]; icon: React.ReactNode }

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  },
  {
    href: '/dashboard/teachers',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  },
  {
    href: '/dashboard/students',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
  },
  {
    href: '/dashboard/groups',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
  },
  {
    href: '/dashboard/fields',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  },
  {
    href: '/dashboard/courses',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  },
  {
    href: '/dashboard/planning',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  },
  {
    href: '/dashboard/reports',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  },
  {
    href: '/dashboard/invitations',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  },
  {
    href: '/dashboard/settings',
    roles: ['super_admin', 'admin'],
    icon: <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  },
]

// ── Component ──────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuthStore()
  const { language } = useSettingsStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const lang = (language || 'fr') as Lang
  const isRtl = lang === 'ar'
  const ui = UI[lang]

  useEffect(() => { setMobileOpen(false) }, [pathname])

  if (!profile) return null

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(profile.role))
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
  const handleSignOut = async () => { await signOut(); router.push('/auth/login') }

  const sidebarInner = (
    <div className={`w-64 bg-slate-900 flex flex-col h-full ${isRtl ? 'border-l' : 'border-r'} border-slate-800 `}>

      {/* Logo + name */}
      <div className="px-4 py-6 border-b border-slate-200 dark:border-slate-700"> 
        <Link href="/dashboard" className={`flex items-center gap-3 mb-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="p-1">
            {/* Use the SVG Component here */}
            <LogoIcon className="w-10 h-10" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Attend<span className="text-blue-600 dark:text-blue-400">efy</span>
          </span>
        </Link>

        {/* School Badge - Enhanced for Light/Dark */}
        <div className={`bg-slate-100 dark:bg-slate-800/50  border border-slate-200 dark:border-slate-700 rounded-xl p-3 ${isRtl ? 'text-right' : ''}`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              {ui.school}
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {profile.schools?.name}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>📍</span>
              <span className="truncate">{profile.schools?.city}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = isActive(item.href)
          const label = NAV_LABELS[item.href]?.[lang] ?? item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${isRtl ? 'flex-row-reverse' : ''}
                ${active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                  : 'text-slate-400 hover:bg-blue-800 hover:text-white'
                }`}
            >
              <span className={`shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {item.icon}
              </span>
              <span className={`truncate leading-none ${isRtl ? 'text-right flex-1' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-2.5 py-3 border-t border-slate-800 space-y-1">
        <button onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all
            ${isRtl ? 'flex-row-reverse' : ''}`}>
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className={`${isRtl ? 'flex-1 text-right' : ''}`}>{ui.signOut}</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex h-screen sticky top-0 shrink-0">{sidebarInner}</div>

      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(v => !v)}
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-slate-900 border border-slate-800
          rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition shadow-lg"
        aria-label="Toggle menu">
        {mobileOpen
          ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        }
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className={`md:hidden fixed top-0 z-40 h-full shadow-2xl ${isRtl ? 'right-0' : 'left-0'}`}>
            {sidebarInner}
          </div>
        </>
      )}
    </>
  )
}
