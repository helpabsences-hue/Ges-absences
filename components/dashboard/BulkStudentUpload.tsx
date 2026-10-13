'use client'
import { toast } from 'sonner'
// components/dashboard/BulkStudentUpload.tsx

import { useRef, useState } from 'react'
import Papa, { type ParseResult } from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { useStudentStore } from '@/stores/useStudentStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { parseWorkbook, type ParsedFile } from '@/lib/massarImport'

interface UploadResult {
  inserted: number
  updated:  number
  moved:    number
  groupsCreated: string[]
  format:   'massar' | 'simple' | null
  skipped:  string[]
  errors:   string[]
}

function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        resolve(XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' }))
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

  const processRows = async (parsed: ParsedFile): Promise<UploadResult> => {
    const supabase  = createClient()
    const school_id = profile!.school_id!
    const res: UploadResult = { inserted: 0, updated: 0, moved: 0, groupsCreated: [], format: parsed.format, skipped: [], errors: [] }

    // ── Plan limit ──
    const { data: school } = await supabase.from('schools').select('plan').eq('id', school_id).single()
    const plan  = school?.plan ?? 'starter'
    const PLAN_LIMITS: Record<string, number> = { starter: 150, growth: 350, premium: Infinity }
    const limit = PLAN_LIMITS[plan] ?? 150

    // ── Existing students (by Massar code) ──
    const { data: existingRows } = await supabase
      .from('students').select('id, massar_code, group_id, date_of_birth, gender').eq('school_id', school_id)
    const existing = new Map((existingRows ?? []).map((s: any) => [String(s.massar_code).trim().toUpperCase(), s]))
    const remaining = limit - existing.size

    // ── Groups (create missing ones for a Massar file) ──
    const { data: groups } = await supabase.from('groups').select('id, name').eq('school_id', school_id)
    const groupMap = new Map((groups ?? []).map(g => [g.name.trim().toLowerCase(), g.id]))

    if (parsed.format === 'massar') {
      const needed = [...new Set(parsed.rows.map(r => r.group_name))].filter(g => !groupMap.has(g.toLowerCase()))
      for (const name of needed) {
        const { data, error } = await supabase.from('groups')
          .insert({ name, year: parsed.groupYears[name], school_id, field_id: null })
          .select('id').single()
        if (error) { res.errors.push(`Groupe "${name}": ${error.message}`); continue }
        groupMap.set(name.toLowerCase(), data.id)
        res.groupsCreated.push(name)
      }
    }

    // ── Sort rows: new students vs existing ones ──
    const toInsert: any[] = []
    const toUpdate: { id: string; values: any; moved: boolean }[] = []
    const seen = new Set<string>()

    for (const r of parsed.rows) {
      if (!r.name || !r.massar_code || !r.group_name) {
        res.errors.push(`${r.line}: champs manquants (nom, code Massar, groupe)`)
        continue
      }
      const code = r.massar_code.toUpperCase()
      if (seen.has(code)) { res.skipped.push(`${r.line}: code ${r.massar_code} en double dans le fichier`); continue }
      seen.add(code)

      const group_id = groupMap.get(r.group_name.toLowerCase())

      const old = existing.get(code)
      if (old) {
        // Already in Attendefy → move to the new class (new school year) + fill birth date / gender if missing
        const values: any = {}
        const moved = !!group_id && old.group_id !== group_id
        if (moved) values.group_id = group_id
        if (r.date_of_birth && !old.date_of_birth) values.date_of_birth = r.date_of_birth
        if (r.gender && !old.gender) values.gender = r.gender
        if (Object.keys(values).length > 0) toUpdate.push({ id: old.id, values, moved })
        else if (!group_id) res.skipped.push(`${r.line}: groupe "${r.group_name}" introuvable`)
        else res.skipped.push(`${r.line}: ${r.name} existe déjà`)
        continue
      }

      if (!group_id) { res.skipped.push(`${r.line}: groupe "${r.group_name}" introuvable`); continue }

      if (toInsert.length >= remaining) {
        res.skipped.push(`${r.line}: limite du plan ${plan} atteinte (${limit} élèves max)`)
        continue
      }

      toInsert.push({
        name: r.name, massar_code: r.massar_code, group_id, school_id,
        date_of_birth: r.date_of_birth ?? null,
        gender:        r.gender ?? null,
        parent_name:   r.parent_name  ?? null,
        parent_phone:  r.parent_phone ?? null,
        parent_email:  r.parent_email ?? null,
      })
    }

    if (remaining <= 0 && toInsert.length === 0 && parsed.rows.some(r => !existing.has(r.massar_code.toUpperCase()))) {
      toast.error(`Limite du plan ${plan} atteinte (${limit} élèves). Contactez-nous pour upgrader.`)
    }

    // ── Insert (batch; if a code is taken elsewhere, retry one by one) ──
    if (toInsert.length > 0) {
      const { data, error } = await supabase.from('students').insert(toInsert).select('id')
      if (!error) {
        res.inserted = data?.length ?? toInsert.length
      } else if (error.code === '23505') {
        for (const row of toInsert) {
          const { error: e } = await supabase.from('students').insert(row)
          if (!e) res.inserted++
          else res.skipped.push(`${row.name} (${row.massar_code}): code Massar déjà utilisé`)
        }
      } else {
        throw error
      }
    }

    // ── Update existing students (class / birth date / gender) ──
    for (const u of toUpdate) {
      const { error } = await supabase.from('students').update(u.values).eq('id', u.id)
      if (error) { res.errors.push(`Mise à jour: ${error.message}`); continue }
      if (u.moved) res.moved++
      else res.updated++
    }

    return res
  }

  const handleUpload = async () => {
    if (!file || !profile?.school_id) return
    setLoading(true)
    setResult(null)

    try {
      let parsed: ParsedFile

      if (isExcel(file)) {
        parsed = parseWorkbook(await readWorkbook(file))
      } else {
        const records = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
          Papa.parse<Record<string, unknown>>(file, {
            header: true, skipEmptyLines: true,
            complete: (r: ParseResult<Record<string, unknown>>) => resolve(r.data),
            error:   (err: any) => reject(new Error('CSV parse error: ' + err.message)),
          })
        })
        const ws = XLSX.utils.json_to_sheet(records)
        parsed = parseWorkbook({ SheetNames: ['csv'], Sheets: { csv: ws } } as XLSX.WorkBook)
      }

      const result = await processRows(parsed)
      setResult(result)

      if (result.inserted > 0 || result.updated > 0 || result.moved > 0) {
        fetchStudents()
        setFile(null)
        if (fileRef.current) fileRef.current.value = ''
      }
    } catch (err: any) {
      setResult({ inserted: 0, updated: 0, moved: 0, groupsCreated: [], format: null, skipped: [], errors: [err.message ?? 'Upload failed'] })
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
          {result.format === 'massar' && (
            <p className="text-xs text-blue-400">📄 Fichier Massar détecté</p>
          )}
          {result.groupsCreated.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2.5 rounded-xl">
              {result.groupsCreated.length} groupe{result.groupsCreated.length !== 1 ? 's' : ''} créé{result.groupsCreated.length !== 1 ? 's' : ''} : {result.groupsCreated.join(', ')}
            </div>
          )}
          {result.moved > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-2.5 rounded-xl">
              {result.moved} étudiant{result.moved !== 1 ? 's' : ''} changé{result.moved !== 1 ? 's' : ''} de classe
            </div>
          )}
          {result.updated > 0 && (
            <div className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-2.5 rounded-xl">
              {result.updated} étudiant{result.updated !== 1 ? 's' : ''} existant{result.updated !== 1 ? 's' : ''} mis à jour (date de naissance)
            </div>
          )}
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
        <p className="text-xs font-medium text-slate-500 mb-1.5">Formats acceptés</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-blue-400 font-medium">Fichier Massar</span> (لائحة التلاميذ) tel quel — une feuille par classe, les classes manquantes sont créées.
        </p>
        <p className="text-xs text-slate-500 mt-1.5">Ou un fichier simple :</p>
        <code className="text-xs text-slate-400 block leading-relaxed">
          name | massar_code | group_name | parent_name | parent_phone | parent_email
        </code>
      </div>
    </div>
  )
}