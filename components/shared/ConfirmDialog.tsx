'use client'

interface ConfirmDialogProps {
  open:      boolean
  title:     string
  message:   string
  confirmLabel: string
  cancelLabel:  string
  onConfirm: () => void
  onCancel:  () => void
  loading?:  boolean
}

export function ConfirmDialog({
  open, title, message, confirmLabel, cancelLabel,
  onConfirm, onCancel, loading
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel}/>

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>

        {/* Text */}
        <div className="text-center space-y-1">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300
              bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-red-600 hover:bg-red-500 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}