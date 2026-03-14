// stores/useSettingsStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme    = 'dark' | 'light'
export type Language = 'fr' | 'en' | 'ar'

interface SettingsState {
  theme:     Theme
  language:  Language
  setTheme:    (t: Theme)    => void
  setLanguage: (l: Language) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme:    'dark',
      language: 'fr',

      setTheme: (theme) => {
        set({ theme })
        // Apply to <html> immediately
        const root = document.documentElement
        root.classList.remove('dark', 'light')
        root.classList.add(theme)
        root.setAttribute('data-theme', theme)
      },

      setLanguage: (language) => {
        set({ language })
        document.documentElement.setAttribute('lang', language)
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
      },
    }),
    { name: 'attendify-settings' }
  )
)
