// lib/massarImport.ts — read a student file: Massar export (لائحة التلاميذ) or the simple Attendefy format

import * as XLSX from 'xlsx'

export interface ImportRow {
  line: string               // where it came from, for error messages ("2BACSVT-1 · ligne 11")
  name: string
  massar_code: string
  group_name: string
  date_of_birth?: string     // YYYY-MM-DD
  gender?: 'M' | 'F'
  parent_name?: string
  parent_phone?: string
  parent_email?: string
}

export interface ParsedFile {
  format: 'massar' | 'simple'
  rows: ImportRow[]
  groupYears: Record<string, number>   // group name → school-year start (for groups to create)
}

// Arabic letters vary (الإسم / الاسم) — compare without hamza forms and spaces
const norm = (v: unknown) => String(v ?? '').replace(/[إأآ]/g, 'ا').replace(/\s+/g, '').trim()

// Excel date number → YYYY-MM-DD (no timezone shift)
function serialToISO(n: number): string {
  const ms = Date.UTC(1899, 11, 30) + Math.round(n) * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

// Accepts 21/03/2013, 21-03-2013, 2013-03-21, an Excel date number or a Date
export function toISODate(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'number' && v > 1000 && v < 80000) return serialToISO(v)
  if (v instanceof Date && !isNaN(v.getTime())) return serialToISO(v.getTime() / 86400000 + 25569)
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return undefined
}

function toGender(v: unknown): 'M' | 'F' | undefined {
  const s = norm(v).toUpperCase()
  if (['M', 'H', 'ذكر', 'MALE', 'GARCON', 'GARÇON'].includes(s)) return 'M'
  if (['F', 'انثى', 'انثي', 'FEMALE', 'FILLE'].includes(s)) return 'F'
  return undefined
}

function currentSchoolYearStart(d = new Date()): number {
  return d.getMonth() + 1 >= 9 ? d.getFullYear() : d.getFullYear() - 1
}

// Value written next to a label like "القسم" or "السنة الدراسية" in the header area
function valueNextTo(grid: unknown[][], label: string, maxRow: number): string {
  const L = norm(label)
  for (let r = 0; r < Math.min(maxRow, grid.length); r++) {
    const row = grid[r] ?? []
    for (let c = 0; c < row.length; c++) {
      if (norm(row[c]).includes(L)) {
        for (let k = c + 1; k < row.length; k++) {
          const v = String(row[k] ?? '').trim()
          if (v) return v
        }
      }
    }
  }
  return ''
}

function parseMassarSheet(name: string, grid: unknown[][], headerRow: number, out: ParsedFile) {
  const header = (grid[headerRow] ?? []).map(norm)
  const col = (...labels: string[]) => header.findIndex(h => labels.some(l => h === norm(l) || h.includes(norm(l))))

  const cCode   = col('الرمز')
  const cNom    = col('النسب')
  const cPrenom = col('الاسم')
  const cGender = col('النوع')
  const cDob    = col('تاريخ')

  const groupName = valueNextTo(grid, 'القسم', headerRow) || name.trim()
  const yearText  = valueNextTo(grid, 'السنة الدراسية', headerRow)
  const yearMatch = yearText.match(/(\d{4})/)
  out.groupYears[groupName] = yearMatch ? Number(yearMatch[1]) : currentSchoolYearStart()

  for (let r = headerRow + 1; r < grid.length; r++) {
    const row  = grid[r] ?? []
    const code = String(row[cCode] ?? '').trim()
    if (!code) continue
    const nom    = String(row[cNom] ?? '').trim()
    const prenom = String(row[cPrenom] ?? '').trim()
    out.rows.push({
      line: `${groupName} · ligne ${r + 1}`,
      name: [prenom, nom].filter(Boolean).join(' '),
      massar_code: code,
      group_name: groupName,
      date_of_birth: cDob >= 0 ? toISODate(row[cDob]) : undefined,
      gender: cGender >= 0 ? toGender(row[cGender]) : undefined,
    })
  }
}

export function parseWorkbook(wb: XLSX.WorkBook): ParsedFile {
  const out: ParsedFile = { format: 'simple', rows: [], groupYears: {} }

  // 1) Massar: a sheet whose header row contains "الرمز"
  for (const sheetName of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: true, defval: '' })
    const headerRow = grid.slice(0, 30).findIndex(row => (row ?? []).some(c => norm(c) === norm('الرمز')))
    if (headerRow >= 0) {
      out.format = 'massar'
      parseMassarSheet(sheetName, grid, headerRow, out)
    }
  }
  if (out.format === 'massar') return out

  // 2) Simple format: name | massar_code | group_name | parent_name | parent_phone | parent_email
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true })
  rows.forEach((r, i) => {
    out.rows.push({
      line: `Ligne ${i + 2}`,
      name: String(r.name ?? '').trim(),
      massar_code: String(r.massar_code ?? '').trim(),
      group_name: String(r.group_name ?? '').trim(),
      date_of_birth: toISODate(r.date_of_birth),
      parent_name: String(r.parent_name ?? '').trim() || undefined,
      parent_phone: String(r.parent_phone ?? '').trim() || undefined,
      parent_email: String(r.parent_email ?? '').trim() || undefined,
    })
  })
  return out
}