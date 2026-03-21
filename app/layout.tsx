// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/shared/ThemeProvider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title:       'Attendify',
  description: 'Multi-tenant school attendance management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
