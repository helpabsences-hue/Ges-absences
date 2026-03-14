'use client'
// components/shared/DataTable.tsx

interface Column<T> {
  key:       string
  label:     string
  render?:   (row: T) => React.ReactNode
  className?: string
}

interface Props<T> {
  columns:    Column<T>[]
  data:       T[]
  keyField:   keyof T
  loading?:   boolean
  emptyIcon?: React.ReactNode
  emptyTitle: string
  emptySubtitle?: string
  actions?:   (row: T) => React.ReactNode
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}

function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
        {icon ?? (
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <p className="text-slate-400 font-medium">{title}</p>
      {subtitle && <p className="text-slate-600 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

export default function DataTable<T>({
  columns, data, keyField, loading,
  emptyIcon, emptyTitle, emptySubtitle,
  actions,
}: Props<T>) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {loading ? (
        <Spinner />
      ) : data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((row) => (
              <tr key={String(row[keyField])} className="hover:bg-slate-800/40 transition group">
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 ${col.className ?? ''}`}>
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                  </td>
                ))}
                {actions && (
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
