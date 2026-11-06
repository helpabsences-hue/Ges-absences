// app/auth/register/layout.tsx
// Loads the ads/analytics tags (Meta Pixel, Google, TikTok) on the sign-up page only,
// so a completed school sign-up can be reported as a conversion.
import Script from 'next/script'

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Script src="/tracking.js" strategy="afterInteractive" />
    </>
  )
}
