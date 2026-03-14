// src/app/page.tsx
// Root "/" redirects are handled by middleware.ts.
// This file exists only as a fallback in case middleware doesn't fire
// (e.g. static export). In normal Vercel/Node deployments middleware
// handles the redirect before this renders.

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/auth/login')
}