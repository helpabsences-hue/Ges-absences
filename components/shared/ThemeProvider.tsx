'use client'
// components/shared/ThemeProvider.tsx
// Applies persisted theme + language on first render, avoids flash

import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, language } = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
    root.setAttribute('data-theme', theme)
    root.setAttribute('lang', language)
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
  }, [theme, language])

  return <>{children}</>
}
