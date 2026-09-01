'use client'
import { toast } from 'sonner'
// components/dashboard/BulkStudentUpload.tsx

import { useRef, useState } from 'react'
import Papa, { type ParseResult } from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useStudentStore } from '@/stores/useStudentStore'
import { useAuthStore } from '@/stores/useAuthStore'

interface FileRow {
  name:          string
  massar_code:   string
  group_name:    string
  parent_name?:  string
  parent_phone?: string
  parent_email?: string
}

interface UploadResult {
  inserted: number
  skipped:  string[]
  errors:   string[]
}

function parseExcel(file: File): Promise<FileRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<FileRow>(ws, { defval: '' })
        resolve(rows)
      } catch (err: any) {
        reject(new Error('Excel parse error: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export default function BulkStudentUpload() {
  const fileRef               = useRef<HTMLInputElement>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<UploadResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const { fetchStudents } = useStudentStore()
  const { profile }       = useAuthStore()

  const isExcel = (f: File) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
  const isCsv   = (f: File) => f.name.endsWith('.csv')

  const pickFile = (f: File | null) => {
    if (!f) return
    if (!isCsv(f) && !isExcel(f)) {
      toast.error('Please select a .csv or .xlsx file.')
      return
    }
    setFile(f)
    setResult(null)
  }

  const processRows = async (rows: FileRow[]) => {
    const supabase = createClient()

    const { data: groups } = await supabase
      .from('groups')
      .select('id, name')
      .eq('school_id', profile!.school_id)

    const groupMap = new Map((groups ?? []).map(g => [g.name.trim().toLowerCase(), g.id]))

    const toInsert: any[] = []
    const skipped: string[] = []
    const errors:  string[] = []

    rows.forEach((row, i) => {
      const name        = String(row.name ?? '').trim()
      const massar_code = String(row.massar_code ?? '').trim()
      const group_name  = String(row.group_name ?? '').trim()

      if (!name || !massar_code || !group_name) {
        errors.push(`Ligne ${i + 2}: champs manquants (name, massar_code, group_name requis)`)
        return
      }

      const group_id = groupMap.get(group_name.toLowerCase())
      if (!group_id) {
        skipped.push(`Ligne ${i + 2}: groupe "${group_name}" introuvable`)
        return
      }

      toInsert.push({
        name, massar_code, group_id,
        school_id:    profile!.school_id!,
        parent_name:  String(row.parent_name  ?? '').trim() || undefined,
        parent_phone: String(row.parent_phone ?? '').trim() || undefined,
        parent_email: String(row.parent_email ?? '').trim() || undefined,
      })
    })

    let inserted = 0
    if (toInsert.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .insert(toInsert)
        .select('id')

      if (error) {
        if (error.code === '23505') {
          errors.push('Certains étudiants ont été ignorés (code Massar en double).')
        } else {
          throw error
        }
      } else {
        inserted = data?.length ?? toInsert.length
      }
    }

    return { inserted, skipped, errors }
  }

  const handleUpload = async () => {
    if (!file || !profile?.school_id) return
    setLoading(true)
    setResult(null)

    try {
      let rows: FileRow[]

      if (isExcel(file)) {
        rows = await parseExcel(file)
      } else {
        rows = await new Promise<FileRow[]>((resolve, reject) => {
          Papa.parse<FileRow>(file, {
            header: true, skipEmptyLines: true,
            complete: (r: ParseResult<FileRow>) => resolve(r.data),
            error:   (err: any) => reject(new Error('CSV parse error: ' + err.message)),
          })
        })
      }

      const result = await processRows(rows)
      setResult(result)

      if (result.inserted > 0) {
        fetchStudents()
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
      }
    } catch (err: any) {
      setResult({ inserted: 0, skipped: [], errors: [err.message ?? 'Upload failed'] })
    } finally {
      setLoading(false)
    }
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
          accept=".csv,.xlsx,.xls"
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
              <span className="text-blue-400 font-medium">Cliquez</span> ou glissez-déposez
            </p>
            <p className="text-xs text-slate-600">
              Fichier <span className="text-green-400 font-medium">.xlsx</span> ou <span className="text-blue-400 font-medium">.csv</span>
            </p>
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
              Importation…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importer les étudiants
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
              {result.inserted} étudiant{result.inserted !== 1 ? 's' : ''} importé{result.inserted !== 1 ? 's' : ''} avec succès
            </div>
          )}
          {result.skipped.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-2.5 rounded-xl space-y-0.5">
              <p className="font-medium">⚠ {result.skipped.length} ligne{result.skipped.length !== 1 ? 's' : ''} ignorée{result.skipped.length !== 1 ? 's' : ''}</p>
              {result.skipped.map((s, i) => <p key={i} className="text-xs opacity-80">{s}</p>)}
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2.5 rounded-xl space-y-0.5">
              <p className="font-medium">✕ {result.errors.length} erreur{result.errors.length !== 1 ? 's' : ''}</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs opacity-80">{e}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Format hint */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-xl px-4 py-3">
        <p className="text-xs font-medium text-slate-500 mb-1.5">Format attendu (Excel ou CSV)</p>
        <code className="text-xs text-slate-400 block leading-relaxed">
          name | massar_code | group_name | parent_name | parent_phone | parent_email
        </code>
      </div>
    </div>
  )
}