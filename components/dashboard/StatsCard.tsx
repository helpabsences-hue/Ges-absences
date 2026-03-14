// components/dashboard/StatsCard.tsx
import Link from 'next/link'

interface Props {
  label:  string
  value:  number | string
  icon:   string
  color:  string   // tailwind text color class e.g. 'text-blue-400'
  href?:  string
}

export default function StatsCard({ label, value, icon, color, href }: Props) {
  const inner = (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl px-5 py-5 transition-all group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        {href && (
          <svg className="w-4 h-4 text-slate-700 group-hover:text-slate-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
