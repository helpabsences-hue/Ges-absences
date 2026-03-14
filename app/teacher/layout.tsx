// src/app/teacher/layout.tsx
import { requireAuth } from '@/lib/auth'
import TeacherShell from './_shell'

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Guard: only teachers can access /teacher routes
  // Admins/super_admins are redirected to /dashboard
  await requireAuth(['teacher'])

  return <TeacherShell>{children}</TeacherShell>
}