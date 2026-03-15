'use client'
// components/theme-provider.tsx
// Passthrough — actual theme logic is in components/shared/ThemeProvider.tsx

import * as React from 'react'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}