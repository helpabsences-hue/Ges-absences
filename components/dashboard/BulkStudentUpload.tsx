'use client'
import { toast } from 'sonner'
// components/dashboard/BulkStudentUpload.tsx

import { useRef, useState } from 'react'
import Papa, { type ParseResult } from 'papaparse'
import { createClient } from '@/lib/supabase/client'
import { useStudentStore } from '@/stores/useStudentStore'
import { useAuthStore } from '@/stores/useAuthStore'

interface CSVRow {
  name: string
  massar_code: string
  group_name: string
}

interface UploadResult {
  inserted: number
  skipped:  string[]
  errors:   string[]
}

export default function BulkStudentUpload() {
  const fileRef              = useRef<HTMLInputElement>(null)
  const [file, setFile]      = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]  = useState<UploadResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const { fetchStudents } = useStudentStore()
  const { profile }       = useAuthStore()

  const pickFile = (f: File | null) => {
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      toast.error('Please select a .csv file.')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleUpload = async () => {
    if (!file || !profile?.school_id) return
    setLoading(true)
    setResult(null)

    Papa.parse<CSVRow>(file, {
      header:         true,
      skipEmptyLines: true,
      complete: async (parsed: ParseResult<CSVRow>) => {
        try {
          const supabase = createClient()

          // Fetch groups for this school
          const { data: groups } = await supabase
            .from('groups')
            .select('id, name')
            .eq('school_id', profile.school_id)

          const groupMap = new Map((groups ?? []).map(g => [g.name.trim().toLowerCase(), g.id]))

          const toInsert: { name: string; massar_code: string; group_id: string; school_id: string }[] = []
          const skipped: string[]  = []
          const errors:  string[]  = []

          parsed.data.forEach((row, i) => {
            const name        = row.name?.trim()
            const massar_code = row.massar_code?.trim()
            const group_name  = row.group_name?.trim()

            if (!name || !massar_code || !group_name) {
              errors.push(`Row ${i + 2}: missing fields (name, massar_code, group_name required)`)
              return
            }

            const group_id = groupMap.get(group_name.toLowerCase())
            if (!group_id) {
              skipped.push(`Row ${i + 2}: group "${group_name}" not found`)
              return
            }

            toInsert.push({ name, massar_code, group_id, school_id: profile.school_id! })
          })

          let inserted = 0
          if (toInsert.length > 0) {
            const { data, error } = await supabase
              .from('students')
              .insert(toInsert)
              .select('id')

            if (error) {
              // handle duplicate massar_code gracefully
              if (error.code === '23505') {
                errors.push('Some students were skipped (duplicate massar code).')
              } else {
                throw error
              }
            } else {
              inserted = data?.length ?? toInsert.length
            }
          }

          setResult({ inserted, skipped, errors })
          if (inserted > 0) {
            fetchStudents()
            setFile(null)
            if (fileRef.current) fileRef.current.value = ''
          }
        } catch (err: any) {
          setResult({ inserted: 0, skipped: [], errors: [err.message ?? 'Upload failed'] })
        } finally {
          setLoading(false)
        }
      },
      error: (err) => {
        setResult({ inserted: 0, skipped: [], errors: ['CSV parse error: ' + err.message] })
        setLoading(false)
      },
    })
  }

  return (
    <div className="space-y-3">

      {/* Drop zone */}
      <div
        onDragOver={e  => { e.preventDefault(); setDragOver(true)  }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          pickFile(e.dataTransfer.files?.[0] ?? null)
        }}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-xl px-5 py-6 text-center transition-all
          ${dragOver
            ? 'border-blue-500 bg-blue-500/5'
            : file
              ? 'border-green-500/40 bg-green-500/5'
              : 'border-slate-700 hover:border-slate-600 bg-slate-800/40 hover:bg-slate-800/60'
          }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => pickFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-400 truncate max-w-[260px]">{file.name}</span>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setResult(null); if (fileRef.current) fileRef.current.value = '' }}
              className="text-slate-500 hover:text-red-400 transition ml-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <svg className="w-8 h-8 text-slate-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-slate-400">
              <span className="text-blue-400 font-medium">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-slate-600">CSV file — columns: <code className="text-slate-500">name, massar_code, group_name</code></p>
          </div>
        )}
      </div>

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Students
            </>
          )}
        </button>
      )}

      {/* Result feedback */}
      {result && (
        <div className="space-y-2 text-sm">
          {result.inserted > 0 && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2.5 rounded-xl">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              {result.inserted} student{result.inserted !== 1 ? 's' : ''} imported successfully
            </div>
          )}
          {result.skipped.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-2.5 rounded-xl space-y-0.5">
              <p className="font-medium">⚠ {result.skipped.length} row{result.skipped.length !== 1 ? 's' : ''} skipped</p>
              {result.skipped.map((s, i) => <p key={i} className="text-xs opacity-80">{s}</p>)}
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2.5 rounded-xl space-y-0.5">
              <p className="font-medium">✕ {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs opacity-80">{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* CSV format hint */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-slate-500 mb-1.5">Expected CSV format</p>
        <code className="text-xs text-slate-400 block leading-relaxed">
          name,massar_code,group_name<br/>
          Ahmed Benali,J123456789,2BAC-1<br/>
          Sara Alaoui,K987654321,2BAC-2
        </code>
      </div>
    </div>
  )
}
