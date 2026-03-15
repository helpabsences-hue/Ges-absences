'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('idle')
  const [email, setEmail] = useState('')

  const send = async () => {
    setStep('clicked')
    if (!email) { setStep('ERROR: email empty'); return }
    setStep('calling supabase...')
    try {
      const sb = createClient()
      setStep('client created, sending...')
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/callback?type=recovery'
      })
      if (error) {
        setStep('ERROR: ' + error.message)
      } else {
        setStep('SUCCESS — check your email!')
      }
    } catch(e: any) {
      setStep('EXCEPTION: ' + String(e))
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      <h1 style={{ marginBottom: 20 }}>Forgot Password — Debug</h1>

      <div style={{ marginBottom: 12 }}>
        <label>Email: </label>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: 'white', width: 280, marginLeft: 8 }}
        />
      </div>

      <button
        onClick={send}
        style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
      >
        Send Reset Email
      </button>

      <div style={{ marginTop: 24, padding: 16, background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
        <strong>Status:</strong> <span style={{ color: step.startsWith('ERROR') ? '#f87171' : step.startsWith('SUCCESS') ? '#4ade80' : '#facc15' }}>{step}</span>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
        Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
      </div>
    </div>
  )
}
