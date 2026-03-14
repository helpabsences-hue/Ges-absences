'use client'
// app/dashboard/reports/page.tsx

import { useEffect, useState, useCallback } from 'react'
import { createClient }     from '@/lib/supabase/client'
import { useGroupStore }    from '@/stores/useGroupStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Download } from 'lucide-react'

type Lang = 'fr' | 'en' | 'ar'

// ── Translations ─────────────────────────────────────────
const UI: Record<Lang, {
  title: string; subtitle: string
  dateFrom: string; dateTo: string; group: string; allGroups: string
  sessions: string; present: string; absent: string; late: string
  tabStats: string; tabDetails: string
  barTitle: string; pieTitle: string; noData: string; noAbsence: string
  byGroup: string; byStudent: string
  colGroup: string; colPresent: string; colLate: string; colAbsent: string; colRate: string
  colStudent: string; colClass: string; colCourse: string; colDate: string
  colType: string; colReason: string; colState: string
  atRisk: string; records: string
  allFilter: string; absentsFilter: string; latesFilter: string
  exportPdf: string
  noRecords: string; adjustFilters: string
  justified: string; notJustified: string
  absentBadge: string; lateBadge: string
  pdfTitle: string; pdfPeriod: string; allGroupsPdf: string; filteredGroup: string
  generatedOn: string
}> = {
  fr: {
    title: 'Rapports Détaillés', subtitle: "Analyses approfondies et statistiques d'assiduité",
    dateFrom: 'Date de début', dateTo: 'Date de fin', group: 'Groupe', allGroups: 'Tous les groupes',
    sessions: 'Séances', present: 'Présents', absent: 'Absents', late: 'Retards',
    tabStats: 'Statistiques', tabDetails: 'Détails Absences',
    barTitle: 'Assiduité par Classe', pieTitle: 'Raisons des Absences',
    noData: 'Aucune donnée', noAbsence: 'Aucune absence',
    byGroup: 'Par Groupe', byStudent: 'Par Étudiant',
    colGroup: 'Groupe', colPresent: 'Présents', colLate: 'Retards', colAbsent: 'Absents', colRate: 'Taux',
    colStudent: 'Étudiant', colClass: 'Classe', colCourse: 'Cours', colDate: 'Date / Séance',
    colType: 'Type', colReason: 'Raison', colState: 'État',
    atRisk: 'À risque', records: 'relevés',
    allFilter: 'Toutes', absentsFilter: 'Absences', latesFilter: 'Retards',
    exportPdf: 'Télécharger CSV',
    noRecords: 'Aucun enregistrement', adjustFilters: 'Essayez d\'ajuster les filtres',
    justified: 'Justifiée', notJustified: 'Non justifiée',
    absentBadge: 'Absent', lateBadge: 'Retard',
    pdfTitle: 'Rapport d\'Absences Détaillé',
    pdfPeriod: 'Période', allGroupsPdf: 'Tous les groupes', filteredGroup: 'Groupe filtré',
    generatedOn: 'Généré le',
  },
  en: {
    title: 'Detailed Reports', subtitle: 'In-depth analysis and attendance statistics',
    dateFrom: 'Start date', dateTo: 'End date', group: 'Group', allGroups: 'All groups',
    sessions: 'Sessions', present: 'Present', absent: 'Absent', late: 'Late',
    tabStats: 'Statistics', tabDetails: 'Absence Details',
    barTitle: 'Attendance by Class', pieTitle: 'Absence Reasons',
    noData: 'No data', noAbsence: 'No absences',
    byGroup: 'By Group', byStudent: 'By Student',
    colGroup: 'Group', colPresent: 'Present', colLate: 'Late', colAbsent: 'Absent', colRate: 'Rate',
    colStudent: 'Student', colClass: 'Class', colCourse: 'Course', colDate: 'Date / Session',
    colType: 'Type', colReason: 'Reason', colState: 'State',
    atRisk: 'At risk', records: 'records',
    allFilter: 'All', absentsFilter: 'Absences', latesFilter: 'Lates',
    exportPdf: 'Download CSV',
    noRecords: 'No records', adjustFilters: 'Try adjusting your filters',
    justified: 'Justified', notJustified: 'Not justified',
    absentBadge: 'Absent', lateBadge: 'Late',
    pdfTitle: 'Detailed Absence Report',
    pdfPeriod: 'Period', allGroupsPdf: 'All groups', filteredGroup: 'Filtered group',
    generatedOn: 'Generated on',
  },
  ar: {
    title: 'التقارير التفصيلية', subtitle: 'تحليل معمّق وإحصائيات الحضور',
    dateFrom: 'تاريخ البداية', dateTo: 'تاريخ النهاية', group: 'الفصل', allGroups: 'جميع الفصول',
    sessions: 'الحصص', present: 'حاضر', absent: 'غائب', late: 'متأخر',
    tabStats: 'الإحصائيات', tabDetails: 'تفاصيل الغيابات',
    barTitle: 'الحضور حسب الفصل', pieTitle: 'أسباب الغياب',
    noData: 'لا توجد بيانات', noAbsence: 'لا توجد غيابات',
    byGroup: 'حسب الفصل', byStudent: 'حسب الطالب',
    colGroup: 'الفصل', colPresent: 'حاضر', colLate: 'متأخر', colAbsent: 'غائب', colRate: 'النسبة',
    colStudent: 'الطالب', colClass: 'الفصل', colCourse: 'المادة', colDate: 'التاريخ / الحصة',
    colType: 'النوع', colReason: 'السبب', colState: 'الحالة',
    atRisk: 'في خطر', records: 'سجلات',
    allFilter: 'الكل', absentsFilter: 'الغيابات', latesFilter: 'التأخيرات',
    exportPdf: 'تنزيل CSV',
    noRecords: 'لا توجد سجلات', adjustFilters: 'جرّب تعديل الفلاتر',
    justified: 'مبرّر', notJustified: 'غير مبرّر',
    absentBadge: 'غائب', lateBadge: 'متأخر',
    pdfTitle: 'تقرير الغيابات التفصيلي',
    pdfPeriod: 'الفترة', allGroupsPdf: 'جميع الفصول', filteredGroup: 'فصل محدد',
    generatedOn: 'تم الإنشاء في',
  },
}

// ── Types ────────────────────────────────────────────────
interface GroupStat   { group_id: string; group_name: string; year: number; total: number; present: number; absent: number; late: number; rate: number }
interface StudentStat { student_id: string; student_name: string; massar_code: string; group_name: string; total: number; present: number; absent: number; late: number; rate: number }
interface AbsenceRow  { id: string; studentName: string; massarCode: string; groupName: string; courseName: string; date: string; timeSlot: string; status: 'absent' | 'late'; reason: string; justified: boolean }

type MainTab    = 'charts' | 'details'
type StatTab    = 'group' | 'student'
type FilterType = 'all' | 'absent' | 'late'

const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

function rateColor(r: number) { return r >= 85 ? 'text-green-400' : r >= 70 ? 'text-yellow-400' : 'text-red-400' }
function rateBg(r: number)    { return r >= 85 ? 'bg-green-500'   : r >= 70 ? 'bg-yellow-500'   : 'bg-red-500'   }

function RateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${rateBg(rate)}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${rateColor(rate)}`}>{rate}%</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label, assiduiteLabel }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      {label && <p className="font-semibold text-white mb-1">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold text-white">{p.value}{p.name === assiduiteLabel ? '%' : ''}</span>
        </div>
      ))}
    </div>
  )
}

function SkeletonBlock() {
  return <div className="animate-pulse bg-slate-800 rounded-xl h-[260px]" />
}

// ── Main ────────────────────────────────────────────────
export default function ReportsPage() {
  const { groups, fetchGroups } = useGroupStore()
  const { language }            = useSettingsStore()
  const lang   = (language || 'fr') as Lang
  const ui     = UI[lang]
  const isRtl  = lang === 'ar'
  const dateLocale = lang === 'ar' ? 'ar-MA' : lang === 'en' ? 'en-GB' : 'fr-FR'

  const [dateFrom,      setDateFrom]      = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0] })
  const [dateTo,        setDateTo]        = useState(() => new Date().toISOString().split('T')[0])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [mainTab,       setMainTab]       = useState<MainTab>('charts')
  const [statTab,       setStatTab]       = useState<StatTab>('group')
  const [filterType,    setFilterType]    = useState<FilterType>('all')
  const [groupStats,    setGroupStats]    = useState<GroupStat[]>([])
  const [studentStats,  setStudentStats]  = useState<StudentStat[]>([])
  const [reasonData,    setReasonData]    = useState<{ name: string; value: number; fill: string }[]>([])
  const [absenceRows,   setAbsenceRows]   = useState<AbsenceRow[]>([])
  const [totals,        setTotals]        = useState({ sessions: 0, records: 0, present: 0, absent: 0, late: 0 })
  const [loading,       setLoading]       = useState(false)

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const loadReport = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: rows } = await supabase
      .from('attendance')
      .select(`id, status, reason,
        students ( id, name, massar_code, group_id, groups ( id, name ) ),
        class_sessions!inner ( session_date,
          teacher_planning!inner ( group_id, start_time, end_time,
            groups ( id, name, year ), courses ( name ) ) )`)
      .gte('class_sessions.session_date', dateFrom)
      .lte('class_sessions.session_date', dateTo)

    if (!rows) { setLoading(false); return }
    const valid    = rows.filter((r: any) => r.class_sessions?.session_date)
    const filtered = selectedGroup ? valid.filter((r: any) => r.class_sessions?.teacher_planning?.group_id === selectedGroup) : valid

    setTotals({
      sessions: new Set(valid.map((r: any) => r.class_sessions?.session_date)).size,
      records:  filtered.length,
      present:  filtered.filter((r: any) => r.status === 'present').length,
      absent:   filtered.filter((r: any) => r.status === 'absent').length,
      late:     filtered.filter((r: any) => r.status === 'late').length,
    })

    const gMap: Record<string, GroupStat> = {}
    valid.forEach((r: any) => {
      const g = r.class_sessions?.teacher_planning?.groups; if (!g) return
      if (!gMap[g.id]) gMap[g.id] = { group_id: g.id, group_name: g.name, year: g.year, total: 0, present: 0, absent: 0, late: 0, rate: 0 }
      gMap[g.id].total++
      if (r.status === 'present') gMap[g.id].present++
      if (r.status === 'absent')  gMap[g.id].absent++
      if (r.status === 'late')    gMap[g.id].late++
    })
    setGroupStats(Object.values(gMap).map(g => ({ ...g, rate: g.total > 0 ? Math.round(((g.present+g.late)/g.total)*100) : 0 })).sort((a,b) => a.rate-b.rate))

    const sMap: Record<string, StudentStat> = {}
    filtered.forEach((r: any) => {
      const s = r.students; if (!s) return
      if (!sMap[s.id]) sMap[s.id] = { student_id: s.id, student_name: s.name, massar_code: s.massar_code, group_name: s.groups?.name ?? '—', total: 0, present: 0, absent: 0, late: 0, rate: 0 }
      sMap[s.id].total++
      if (r.status === 'present') sMap[s.id].present++
      if (r.status === 'absent')  sMap[s.id].absent++
      if (r.status === 'late')    sMap[s.id].late++
    })
    setStudentStats(Object.values(sMap).map(s => ({ ...s, rate: s.total > 0 ? Math.round(((s.present+s.late)/s.total)*100) : 0 })).sort((a,b) => a.rate-b.rate))

    const rMap: Record<string, number> = {}
    filtered.filter((r: any) => r.status === 'absent').forEach((r: any) => {
      const key = r.reason?.trim() || 'Non spécifié'
      rMap[key] = (rMap[key] ?? 0) + 1
    })
    setReasonData(Object.entries(rMap).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] })))

    setAbsenceRows(
      filtered.filter((r: any) => r.status === 'absent' || r.status === 'late')
        .map((r: any) => {
          const tp = r.class_sessions?.teacher_planning
          return {
            id: r.id, studentName: r.students?.name ?? '—', massarCode: r.students?.massar_code ?? '—',
            groupName: r.students?.groups?.name ?? tp?.groups?.name ?? '—',
            courseName: tp?.courses?.name ?? '—', date: r.class_sessions.session_date,
            timeSlot: tp?.start_time && tp?.end_time ? `${tp.start_time.slice(0,5)}–${tp.end_time.slice(0,5)}` : '—',
            status: r.status, reason: r.reason?.trim() || '', justified: !!r.reason?.trim(),
          }
        }).sort((a, b) => b.date.localeCompare(a.date))
    )
    setLoading(false)
  }, [dateFrom, dateTo, selectedGroup])

  useEffect(() => { loadReport() }, [loadReport])

  const filteredAbsences = absenceRows.filter(r => filterType === 'all' || r.status === filterType)

  // ── Export CSV (zero-dependency, works without npm install) ──
  // To upgrade to PDF: npm install jspdf jspdf-autotable
  const handleExportPDF = () => {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`

    const headers = [
      ui.colStudent, 'Massar', ui.colClass, ui.colCourse,
      ui.colDate, ui.colType, ui.colReason, ui.colState,
    ].map(esc).join(',')

    const rowLines = filteredAbsences.map(r => [
      r.studentName, r.massarCode, r.groupName, r.courseName,
      `${new Date(r.date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })} ${r.timeSlot}`,
      r.status === 'absent' ? ui.absentBadge : ui.lateBadge,
      r.reason || '—',
      r.justified ? ui.justified : ui.notJustified,
    ].map(esc).join(','))

    // BOM prefix so Excel opens UTF-8 correctly
    const csv  = '\uFEFF' + [headers, ...rowLines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `rapport-absences-${dateFrom}-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ──────────────────────────────────────────
  return (
    <div className={`max-w-6xl mx-auto space-y-4 sm:space-y-6 ${isRtl ? 'text-right' : ''}`}>

      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-white">{ui.title}</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{ui.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 sm:px-5 py-4">
        <div className={`flex flex-wrap items-end gap-3 sm:gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div>
            <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>{ui.dateFrom}</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div>
            <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>{ui.dateTo}</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div>
            <label className={`block text-xs font-medium text-slate-400 mb-1.5 ${isRtl ? 'text-right' : ''}`}>{ui.group}</label>
            <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
              className={`bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isRtl ? 'text-right' : ''}`}>
              <option value="">{ui.allGroups}</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} — {g.year}</option>)}
            </select>
          </div>
          <div className={`flex gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
            {[
              { label: lang === 'ar' ? '٧أيام' : lang === 'en' ? '7d' : '7j',  days: 7  },
              { label: lang === 'ar' ? '٣٠يوم' : lang === 'en' ? '30d' : '30j', days: 30 },
              { label: lang === 'ar' ? '٩٠يوم' : lang === 'en' ? '90d' : '90j', days: 90 },
            ].map(({ label, days }) => (
              <button key={label} onClick={() => { const d = new Date(); d.setDate(d.getDate()-days); setDateFrom(d.toISOString().split('T')[0]); setDateTo(new Date().toISOString().split('T')[0]) }}
                className="text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: ui.sessions, value: totals.sessions, color: 'text-white'      },
          { label: ui.present,  value: totals.present,  color: 'text-green-400'  },
          { label: ui.absent,   value: totals.absent,   color: 'text-red-400'    },
          { label: ui.late,     value: totals.late,     color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-4 text-center">
            <p className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div className={`flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit ${isRtl ? 'flex-row-reverse' : ''}`}>
        {([{ key: 'charts', label: ui.tabStats }, { key: 'details', label: ui.tabDetails }] as { key: MainTab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${mainTab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── STATS TAB ────────────────────────────────── */}
      {mainTab === 'charts' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Bar chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">{ui.barTitle}</h3>
              </div>
              <div className="p-4 sm:p-6">
                {loading ? <SkeletonBlock /> : groupStats.length === 0 ? (
                  <p className="text-center text-slate-500 py-16 text-sm">{ui.noData}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={groupStats.map(g => ({ class: g.group_name, [ui.colRate]: g.rate }))} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border,#1e293b)" vertical={false} />
                      <XAxis dataKey="class" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground,#94a3b8)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground,#94a3b8)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CustomTooltip assiduiteLabel={ui.colRate} />} />
                      <Bar dataKey={ui.colRate} fill="#3b82f6" radius={[6,6,0,0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Pie chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-white">{ui.pieTitle}</h3>
              </div>
              <div className="p-4 sm:p-6">
                {loading ? <SkeletonBlock /> : reasonData.length === 0 ? (
                  <p className="text-center text-slate-500 py-16 text-sm">{ui.noAbsence}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={reasonData} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                        label={({ percent }) => percent > 0.05 ? `${(percent*100).toFixed(0)}%` : ''} labelLine={false}>
                        {reasonData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={v => <span className="text-xs text-slate-400">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className={`px-4 sm:px-5 py-3 border-b border-slate-800 flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {([{ key: 'group', label: ui.byGroup }, { key: 'student', label: ui.byStudent }] as { key: StatTab; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setStatTab(key)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    ${statTab === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="p-6"><SkeletonBlock /></div>
            ) : statTab === 'group' ? (
              groupStats.length === 0 ? <p className="text-center text-slate-500 py-12 text-sm">{ui.noData}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {[ui.colGroup, ui.colPresent, ui.colLate, ui.colAbsent, ui.colRate].map((h, i) => (
                          <th key={h} className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider
                            ${i === 0 || i === 4 ? (isRtl ? 'text-right' : 'text-left') : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {groupStats.map(g => (
                        <tr key={g.group_id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 sm:px-5 py-4">
                            <p className="text-sm font-semibold text-white">{g.group_name}</p>
                            <p className="text-xs text-slate-500">{g.year} · {g.total} {ui.records}</p>
                          </td>
                          <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-green-400">{g.present}</span></td>
                          <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-yellow-400">{g.late}</span></td>
                          <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-red-400">{g.absent}</span></td>
                          <td className="px-4 sm:px-5 py-4 w-40"><RateBar rate={g.rate} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              studentStats.length === 0 ? <p className="text-center text-slate-500 py-12 text-sm">{ui.noData}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {[ui.colStudent, ui.colClass, ui.colPresent, ui.colLate, ui.colAbsent, ui.colRate].map((h, i) => (
                          <th key={h} className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider
                            ${i <= 1 || i === 5 ? (isRtl ? 'text-right' : 'text-left') : 'text-right'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {studentStats.map(s => (
                        <tr key={s.student_id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 sm:px-5 py-4">
                            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                                ${s.rate < 70 ? 'bg-red-500/20 border border-red-500/30' : 'bg-slate-800'}`}>
                                <span className={`text-xs font-bold ${s.rate < 70 ? 'text-red-400' : 'text-slate-300'}`}>
                                  {s.student_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">{s.student_name}</p>
                                <p className="text-xs text-slate-500 font-mono">{s.massar_code}</p>
                              </div>
                              {s.rate < 70 && <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-md shrink-0">{ui.atRisk}</span>}
                            </div>
                          </td>
                          <td className="px-4 sm:px-5 py-4 text-sm text-slate-400">{s.group_name}</td>
                          <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-green-400">{s.present}</span></td>
                          <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-yellow-400">{s.late}</span></td>
                          <td className="px-4 sm:px-5 py-4 text-right"><span className="text-sm font-medium text-red-400">{s.absent}</span></td>
                          <td className="px-4 sm:px-5 py-4 w-40"><RateBar rate={s.rate} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ── DETAILS TAB ──────────────────────────────── */}
      {mainTab === 'details' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className={`px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap
            ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-1.5 sm:gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
              {([
                { key: 'all',    label: `${ui.allFilter} (${absenceRows.length})`                                        },
                { key: 'absent', label: `${ui.absentsFilter} (${absenceRows.filter(r => r.status==='absent').length})`  },
                { key: 'late',   label: `${ui.latesFilter} (${absenceRows.filter(r => r.status==='late').length})`      },
              ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setFilterType(key)}
                  className={`text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition
                    ${filterType === key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={handleExportPDF}
              className={`flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700
                text-slate-300 hover:text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition shrink-0
                ${isRtl ? 'flex-row-reverse' : ''}`}>
              <Download className="w-4 h-4 shrink-0" />
              {ui.exportPdf}
            </button>
          </div>

          {loading ? (
            <div className="p-6"><SkeletonBlock /></div>
          ) : filteredAbsences.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 font-medium">{ui.noRecords}</p>
              <p className="text-slate-600 text-sm mt-1">{ui.adjustFilters}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {[ui.colStudent, ui.colClass, ui.colCourse, ui.colDate, ui.colType, ui.colReason, ui.colState].map(h => (
                      <th key={h} className={`px-4 sm:px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap
                        ${isRtl ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsences.map(r => (
                    <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition">
                      <td className="px-4 sm:px-5 py-3">
                        <p className="font-medium text-white">{r.studentName}</p>
                        <p className="text-xs text-slate-500 font-mono">{r.massarCode}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-slate-400 whitespace-nowrap">{r.groupName}</td>
                      <td className="px-4 sm:px-5 py-3 text-slate-400 whitespace-nowrap">{r.courseName}</td>
                      <td className="px-4 sm:px-5 py-3 text-slate-400 whitespace-nowrap">
                        <p>{new Date(r.date).toLocaleDateString(dateLocale, { day:'numeric', month:'short', year:'numeric' })}</p>
                        <p className="text-xs">{r.timeSlot}</p>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                          ${r.status === 'absent' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {r.status === 'absent' ? ui.absentBadge : ui.lateBadge}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-slate-500 text-xs max-w-[120px] truncate italic">{r.reason || '—'}</td>
                      <td className="px-4 sm:px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg
                          ${r.justified ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {r.justified ? ui.justified : ui.notJustified}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredAbsences.length > 0 && (
            <div className="grid grid-cols-3 gap-4 px-5 sm:px-6 py-4 border-t border-slate-800 text-center">
              {[
                { label: ui.justified,    value: filteredAbsences.filter(r => r.justified).length  },
                { label: ui.notJustified, value: filteredAbsences.filter(r => !r.justified).length },
                { label: 'Total',         value: filteredAbsences.length                           },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}