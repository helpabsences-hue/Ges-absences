// src/app/dashboard/layout.tsx
import { requireAuth } from '@/lib/auth'
import DashboardShell from './_shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side auth guard — redirects to /auth/login if not signed in
  // Redirects teachers to /teacher
  await requireAuth(['super_admin', 'admin'])

  return <DashboardShell>{children}</DashboardShell>
}
