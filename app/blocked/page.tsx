'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function BlockedPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">

        <p className="text-2xl font-bold text-white">
          Attend<span className="text-blue-400">efy</span>
        </p>

        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-white">Période d'essai terminée</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Votre période d'essai de 30 jours est expirée. Pour continuer à utiliser Attendefy,
            contactez notre équipe pour activer votre abonnement.
          </p>

          <div className="bg-slate-800 rounded-xl p-4 space-y-2 text-left">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tarifs</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white">1 mois</span>
              <span className="text-sm font-bold text-blue-400">500 MAD</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-white">1 an</span>
              <span className="text-sm font-bold text-blue-400">4 500 MAD</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText('med.himri@attendefy.com')
                toast('Email copié !')
              }}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              med.himri@attendefy.com
            </button>
            <a href="https://wa.me/212628395183" target="_blank"
              className="flex items-center justify-center gap-2 w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 font-semibold py-3 rounded-xl transition text-sm">
              WhatsApp
            </a>
          </div>
        </div>

        <button onClick={handleLogout} className="text-slate-500 hover:text-slate-300 text-sm transition">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}