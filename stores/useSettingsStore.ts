// stores/useSettingsStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'

export type Theme    = 'dark' | 'light'
export type Language = 'fr' | 'en' | 'ar'

interface SettingsState {
  theme:       Theme
  language:    Language
  setTheme:    (t: Theme)    => void
  setLanguage: (l: Language) => void
}

// Get current user ID for per-user storage key
async function getUserId(): Promise<string> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? 'default'
  } catch {
    return 'default'
  }
}

// Custom storage that uses userId as part of the key
function createUserStorage() {
  return createJSONStorage(() => ({
    getItem: (name: string) => {
      const userId = localStorage.getItem('attendify-current-user') ?? 'default'
      return localStorage.getItem(`${name}_${userId}`)
    },
    setItem: (name: string, value: string) => {
      const userId = localStorage.getItem('attendify-current-user') ?? 'default'
      localStorage.setItem(`${name}_${userId}`, value)
    },
    removeItem: (name: string) => {
      const userId = localStorage.getItem('attendify-current-user') ?? 'default'
      localStorage.removeItem(`${name}_${userId}`)
    },
  }))
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme:    'dark',
      language: 'fr',

      setTheme: (theme) => {
        set({ theme })
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
    {
      name:    'attendify-settings',
      storage: createUserStorage(),
    }
  )
)

// Call this after login to set the current user ID
export function initUserSettings(userId: string) {
  localStorage.setItem('attendify-current-user', userId)
  // Reload store with user-specific settings
  useSettingsStore.persist.rehydrate()
}

// Call this on logout to clear the current user
export function clearUserSettings() {
  localStorage.removeItem('attendify-current-user')
}