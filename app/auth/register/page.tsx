// 'use client'

// export const dynamic = 'force-dynamic'
// // src/app/auth/register/page.tsx

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import Link from 'next/link'
// import type { RegisterPayload } from '@/types'
// import { LogoIcon } from '@/components/shared/LogoIcon'

// const INITIAL: RegisterPayload = {
//   schoolName: '',
//   city: '',
//   ownerName: '',
//   email: '',
//   password: '',
// }

// export default function RegisterPage() {
//   const router = useRouter()
//   const [form, setForm] = useState<RegisterPayload>(INITIAL)
//   const [error, setError] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [sent, setSent] = useState(false)
//   const [sentEmail, setSentEmail] = useState('')

//   const set = (field: keyof RegisterPayload) =>
//     (e: React.ChangeEvent<HTMLInputElement>) =>
//       setForm((prev) => ({ ...prev, [field]: e.target.value }))

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)
//     setError('')

//     const res = await fetch('/api/register', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(form),
//     })

//     const data = await res.json()

//     if (!res.ok) {
//       setError(data.error ?? 'Registration failed. Please try again.')
//       setLoading(false)
//       return
//     }

//     // Success — show check email message
//     setSentEmail(form.email)
//     setSent(true)
//   }

//   if (sent) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
//         <div className="relative w-full max-w-md text-center">
//           <div className="inline-flex items-center gap-2 mb-8">
//             <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
//               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
//               </svg>
//             </div>
//             <span className="text-2xl font-bold text-white tracking-tight">
//               Attend<span className="text-blue-400">efy</span>
//             </span>
//           </div>
//           <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-5">
//             <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
//               <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                   d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
//               </svg>
//             </div>
//             <div>
//               <h2 className="text-xl font-bold text-white">Check your email</h2>
//               <p className="text-slate-400 text-sm mt-2">
//                 We sent a confirmation link to
//               </p>
//               <p className="text-white font-semibold mt-1">{sentEmail}</p>
//             </div>
//             <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-left">
//               <p className="text-xs text-amber-300">
//                 Check your spam folder if you don&apos;t see it. Click the link to activate your account.
//               </p>
//             </div>
//             <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition">
//               ← Go to login
//             </Link>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
//       {/* Background blobs */}
//       <div className="pointer-events-none fixed inset-0 overflow-hidden">
//         <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
//         <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
//       </div>

//       <div className="relative w-full max-w-md">
//         {/* Logo */}
//         <div className="text-center mb-8">
//           <div className="inline-flex items-center gap-2 mb-3">
//             <LogoIcon className="w-8 h-8 shrink-0" />
//             <span className="text-2xl font-bold text-white tracking-tight">
//               Attend<span className="text-blue-400">efy</span>
//             </span>
//           </div>
//           <p className="text-slate-400 text-sm">Create your school account — free to start</p>
//         </div>

//         {/* Card */}
//         <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
//           <form onSubmit={handleSubmit} className="space-y-5">

//             {/* Section label */}
//             <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
//               School info
//             </p>

//             {/* School name */}
//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">
//                 School name
//               </label>
//               <input
//                 type="text"
//                 required
//                 value={form.schoolName}
//                 onChange={set('schoolName')}
//                 placeholder="Al Amal High School"
//                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//               />
//             </div>

//             {/* City */}
//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">
//                 City
//               </label>
//               <input
//                 type="text"
//                 required
//                 value={form.city}
//                 onChange={set('city')}
//                 placeholder="Casablanca"
//                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//               />
//             </div>

//             {/* Divider */}
//             <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">
//               Your account
//             </p>

//             {/* Owner name */}
//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">
//                 Your full name
//               </label>
//               <input
//                 type="text"
//                 required
//                 value={form.ownerName}
//                 onChange={set('ownerName')}
//                 placeholder="Ahmed Benali"
//                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//               />
//             </div>

//             {/* Email */}
//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">
//                 Email address
//               </label>
//               <input
//                 type="email"
//                 required
//                 autoComplete="email"
//                 value={form.email}
//                 onChange={set('email')}
//                 placeholder="principal@school.com"
//                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//               />
//             </div>

//             Password
//             <div>
//               <label className="block text-sm font-medium text-slate-300 mb-1.5">
//                 Password
//               </label>
//               <input
//                 type="password"
//                 required
//                 minLength={8}
//                 autoComplete="new-password"
//                 value={form.password}
//                 onChange={set('password')}
//                 placeholder="At least 8 characters"
//                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
//               />
//             </div>

//             {/* Error */}
//             {error && (
//               <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
//                 <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
//                     d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//                 {error}
//               </div>
//             )}

//             {/* Submit */}
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
//             >
//               {loading ? (
//                 <>
//                   <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                   </svg>
//                   Creating your school…
//                 </>
//               ) : (
//                 'Create School Account'
//               )}
//             </button>
//           </form>

//           <p className="mt-6 text-center text-sm text-slate-400">
//             Already have an account?{' '}
//             <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
//               Sign in
//             </Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   )
// }


'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { RegisterPayload } from '@/types'
import { LogoIcon } from '@/components/shared/LogoIcon'

const INITIAL: RegisterPayload = {
  schoolName: '', city: '', ownerName: '', email: '', password: '',
}

export default function RegisterPage() {
  const router  = useRouter()
  const [form,    setForm]    = useState<RegisterPayload>(INITIAL)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [step,    setStep]    = useState(1)

  const upd = (field: keyof RegisterPayload) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const res  = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "L'inscription a échoué. Veuillez réessayer.")
      setLoading(false)
      return
    }
    setSent(true)
  }

  // ── Success screen ─────────────────────────────────────
  if (sent) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center gap-2">
          <LogoIcon className="w-9 h-9 shrink-0"/>
          <span className="text-2xl font-bold text-white">Attend<span className="text-blue-400">efy</span></span>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Compte créé avec succès !</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Votre établissement <strong className="text-white">{form.schoolName}</strong> est inscrit sur Attendefy.
              Vous pouvez vous connecter immédiatement.
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-left">
            <p className="text-xs text-blue-300 leading-relaxed">
              🎉 Vous bénéficiez de <strong>30 jours d'essai gratuit</strong> pour explorer toutes les fonctionnalités d'Attendefy.
            </p>
          </div>
          <Link href="/auth/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm">
            Se connecter maintenant →
          </Link>
        </div>
      </div>
    </div>
  )

  // ── Register form ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">

      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl"/>
      </div>

      <div className="relative w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <LogoIcon className="w-10 h-10 shrink-0"/>
            <span className="text-3xl font-bold text-white tracking-tight">
              Attend<span className="text-blue-400">efy</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">Inscription de votre établissement — 30 jours gratuits</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>{s}</div>
              {s < 2 && <div className={`w-16 h-0.5 rounded-full ${step > s ? 'bg-blue-600' : 'bg-slate-800'}`}/>}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mb-6 px-4">
          <span className={step >= 1 ? 'text-blue-400 font-medium' : ''}>Établissement</span>
          <span className={step >= 2 ? 'text-blue-400 font-medium' : ''}>Votre compte</span>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Step 1 — School info */}
            {step === 1 && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Informations de l'établissement</h2>
                  <p className="text-sm text-slate-400">Renseignez les informations de votre école ou lycée</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nom de l'établissement <span className="text-red-400">*</span>
                  </label>
                  <input type="text" required value={form.schoolName} onChange={upd('schoolName')}
                    placeholder="Lycée Al Amal"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Ville <span className="text-red-400">*</span>
                  </label>
                  <input type="text" required value={form.city} onChange={upd('city')}
                    placeholder="Casablanca"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-300 leading-relaxed">
                    ✅ Inscription gratuite — 30 jours d'essai sans carte bancaire
                  </p>
                </div>

                <button type="button"
                  onClick={() => {
                    if (!form.schoolName.trim() || !form.city.trim()) {
                      setError('Veuillez remplir tous les champs.')
                      return
                    }
                    setError('')
                    setStep(2)
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Continuer →
                </button>
              </>
            )}

            {/* Step 2 — Account info */}
            {step === 2 && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Votre compte Directeur</h2>
                  <p className="text-sm text-slate-400">Ces identifiants vous permettront de vous connecter</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nom complet <span className="text-red-400">*</span>
                  </label>
                  <input type="text" required value={form.ownerName} onChange={upd('ownerName')}
                    placeholder="Ahmed Benali"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Adresse email <span className="text-red-400">*</span>
                  </label>
                  <input type="email" required autoComplete="email" value={form.email} onChange={upd('email')}
                    placeholder="directeur@lycee.ma"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Mot de passe <span className="text-red-400">*</span>
                  </label>
                  <input type="password" required minLength={8} autoComplete="new-password"
                    value={form.password} onChange={upd('password')}
                    placeholder="Minimum 8 caractères"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"/>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => { setStep(1); setError('') }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition text-sm">
                    ← Retour
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-2 flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Création…
                      </>
                    ) : 'Créer mon compte'}
                  </button>
                </div>
              </>
            )}

          </form>

          {step === 1 && (
            <p className="mt-6 text-center text-sm text-slate-400">
              Déjà inscrit ?{' '}
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium transition">
                Se connecter
              </Link>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          En vous inscrivant, vous acceptez les conditions d'utilisation d'Attendefy
        </p>
      </div>
    </div>
  )
}