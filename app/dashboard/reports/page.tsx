'use client'
// app/dashboard/reports/page.tsx — lean orchestrator (~120 lines)

import { useEffect, useState, useCallback } from 'react'
import { createClient }     from '@/lib/supabase/client'
import { useGroupStore }    from '@/stores/useGroupStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

import { type Lang, type MainTab, type StatTab, type FilterType, type GroupStat, type StudentStat, type AbsenceRow, PIE_COLORS, parseTime, fmtHours } from '@/components/analytics/reports/types'
import { ReportCharts }       from '@/components/analytics/reports/ReportCharts'
import { ReportStatsTables }  from '@/components/analytics/reports/ReportStatsTables'
import { ReportDetailsTable } from '@/components/analytics/reports/ReportDetailsTable'

const UI: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Rapports Détaillés', subtitle: "Analyses approfondies et statistiques d'assiduité",
    dateFrom: 'Date de début', dateTo: 'Date de fin', group: 'Groupe', allGroups: 'Tous les groupes',
    sessions: 'Séances', present: 'Présents', absent: 'Absents', late: 'Retards',
    tabStats: 'Statistiques', tabDetails: 'Détails Absences',
    barTitle: 'Assiduité par Classe', pieTitle: 'Raisons des Absences',
    noData: 'Aucune donnée', noAbsence: 'Aucune absence',
    byGroup: 'Par Groupe', byStudent: 'Par Étudiant',
    colGroup: 'Groupe', colPresent: 'Présents', colLate: 'Retards', colAbsent: 'Absents', colHours: 'Heures abs.', colRate: 'Taux',
    colStudent: 'Étudiant', colClass: 'Classe', colCourse: 'Cours', colDate: 'Date / Séance',
    colType: 'Type', colReason: 'Raison', colState: 'État',
    atRisk: 'À risque', records: 'relevés', hours: 'h',
    allFilter: 'Toutes', absentsFilter: 'Absences', latesFilter: 'Retards',
    exportCsv: 'Télécharger CSV',
    noRecords: 'Aucun enregistrement', adjustFilters: "Essayez d'ajuster les filtres",
    justified: 'Justifiée', notJustified: 'Non justifiée',
    absentBadge: 'Absent', lateBadge: 'Retard',
  },
  en: {
    title: 'Detailed Reports', subtitle: 'In-depth analysis and attendance statistics',
    dateFrom: 'Start date', dateTo: 'End date', group: 'Group', allGroups: 'All groups',
    sessions: 'Sessions', present: 'Present', absent: 'Absent', late: 'Late',
    tabStats: 'Statistics', tabDetails: 'Absence Details',
    barTitle: 'Attendance by Class', pieTitle: 'Absence Reasons',
    noData: 'No data', noAbsence: 'No absences',
    byGroup: 'By Group', byStudent: 'By Student',
    colGroup: 'Group', colPresent: 'Present', colLate: 'Late', colAbsent: 'Absent', colHours: 'Abs. hours', colRate: 'Rate',
    colStudent: 'Student', colClass: 'Class', colCourse: 'Course', colDate: 'Date / Session',
    colType: 'Type', colReason: 'Reason', colState: 'State',
    atRisk: 'At risk', records: 'records', hours: 'h',
    allFilter: 'All', absentsFilter: 'Absences', latesFilter: 'Lates',
    exportCsv: 'Download CSV',
    noRecords: 'No records', adjustFilters: 'Try adjusting your filters',
    justified: 'Justified', notJustified: 'Not justified',
    absentBadge: 'Absent', lateBadge: 'Late',
  },
  ar: {
    title: 'التقارير التفصيلية', subtitle: 'تحليل معمّق وإحصائيات الحضور',
    dateFrom: 'تاريخ البداية', dateTo: 'تاريخ النهاية', group: 'الفصل', allGroups: 'جميع الفصول',
    sessions: 'الحصص', present: 'حاضر', absent: 'غائب', late: 'متأخر',
    tabStats: 'الإحصائيات', tabDetails: 'تفاصيل الغيابات',
    barTitle: 'الحضور حسب الفصل', pieTitle: 'أسباب الغياب',
    noData: 'لا توجد بيانات', noAbsence: 'لا توجد غيابات',
    byGroup: 'حسب الفصل', byStudent: 'حسب الطالب',
    colGroup: 'الفصل', colPresent: 'حاضر', colLate: 'متأخر', colAbsent: 'غائب', colHours: 'ساعات غياب', colRate: 'النسبة',
    colStudent: 'الطالب', colClass: 'الفصل', colCourse: 'المادة', colDate: 'التاريخ / الحصة',
    colType: 'النوع', colReason: 'السبب', colState: 'الحالة',
    atRisk: 'في خطر', records: 'سجلات', hours: 'س',
    allFilter: 'الكل', absentsFilter: 'الغيابات', latesFilter: 'التأخيرات',
    exportCsv: 'تنزيل CSV',
    noRecords: 'لا توجد سجلات', adjustFilters: 'جرّب تعديل الفلاتر',
    justified: 'مبرّر', notJustified: 'غير مبرّر',
    absentBadge: 'غائب', lateBadge: 'متأخر',
  },
}

export default function ReportsPage() {
  const { groups, fetchGroups } = useGroupStore()
  const { language }            = useSettingsStore()
  const lang       = (language || 'fr') as Lang
  const ui         = UI[lang]
  const isRtl      = lang === 'ar'
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
  const [totals,        setTotals]        = useState({ sessions: 0, present: 0, absent: 0, late: 0 })
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
    const filtered = selectedGroup
      ? valid.filter((r: any) => r.class_sessions?.teacher_planning?.group_id === selectedGroup)
      : valid

    const getDuration = (r: any) => {
      const tp = r.class_sessions?.teacher_planning
      if (!tp?.start_time || !tp?.end_time) return 0
      return Math.max(0, parseTime(tp.end_time) - parseTime(tp.start_time))
    }

    setTotals({
      sessions: new Set(valid.map((r: any) => r.class_sessions?.session_date)).size,
      present:  filtered.filter((r: any) => r.status === 'present').length,
      absent:   filtered.filter((r: any) => r.status === 'absent').length,
      late:     filtered.filter((r: any) => r.status === 'late').length,
    })

    // Group stats
    const gMap: Record<string, GroupStat> = {}
    valid.forEach((r: any) => {
      const g = r.class_sessions?.teacher_planning?.groups; if (!g) return
      if (!gMap[g.id]) gMap[g.id] = { group_id: g.id, group_name: g.name, year: g.year, total: 0, present: 0, absent: 0, late: 0, rate: 0, absenceMinutes: 0 }
      gMap[g.id].total++
      if (r.status === 'present') gMap[g.id].present++
      if (r.status === 'absent')  { gMap[g.id].absent++;  gMap[g.id].absenceMinutes += getDuration(r) }
      if (r.status === 'late')    { gMap[g.id].late++;    gMap[g.id].absenceMinutes += Math.round(getDuration(r) / 2) }
    })
    setGroupStats(Object.values(gMap).map(g => ({ ...g, rate: g.total > 0 ? Math.round(((g.present+g.late)/g.total)*100) : 0 })).sort((a,b) => a.rate-b.rate))

    // Student stats
    const sMap: Record<string, StudentStat> = {}
    filtered.forEach((r: any) => {
      const s = r.students; if (!s) return
      if (!sMap[s.id]) sMap[s.id] = { student_id: s.id, student_name: s.name, massar_code: s.massar_code, group_name: s.groups?.name ?? '—', total: 0, present: 0, absent: 0, late: 0, rate: 0, absenceMinutes: 0 }
      sMap[s.id].total++
      if (r.status === 'present') sMap[s.id].present++
      if (r.status === 'absent')  { sMap[s.id].absent++;  sMap[s.id].absenceMinutes += getDuration(r) }
      if (r.status === 'late')    { sMap[s.id].late++;    sMap[s.id].absenceMinutes += Math.round(getDuration(r) / 2) }
    })
    setStudentStats(Object.values(sMap).map(s => ({ ...s, rate: s.total > 0 ? Math.round(((s.present+s.late)/s.total)*100) : 0 })).sort((a,b) => a.rate-b.rate))

    // Reasons pie
    const rMap: Record<string, number> = {}
    filtered.filter((r: any) => r.status === 'absent').forEach((r: any) => {
      const key = r.reason?.trim() || 'Non spécifié'
      rMap[key] = (rMap[key] ?? 0) + 1
    })
    setReasonData(Object.entries(rMap).map(([name, value], i) => ({ name, value, fill: PIE_COLORS[i % PIE_COLORS.length] })))

    // Absence rows
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
            durationMinutes: getDuration(r),
          }
        }).sort((a, b) => b.date.localeCompare(a.date))
    )
    setLoading(false)
  }, [dateFrom, dateTo, selectedGroup])

  useEffect(() => { loadReport() }, [loadReport])

  const filteredAbsences = absenceRows.filter(r => filterType === 'all' || r.status === filterType)

  const handleExportCsv = () => {
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const headers = [ui.colStudent, 'Massar', ui.colClass, ui.colCourse, ui.colDate, ui.colType, ui.colReason, ui.colState, ui.colHours].map(esc).join(',')
    const rowLines = filteredAbsences.map(r => [
      r.studentName, r.massarCode, r.groupName, r.courseName,
      `${new Date(r.date).toLocaleDateString(dateLocale, { day:'numeric', month:'short', year:'numeric' })} ${r.timeSlot}`,
      r.status === 'absent' ? ui.absentBadge : ui.lateBadge,
      r.reason || '—', r.justified ? ui.justified : ui.notJustified,
      fmtHours(r.durationMinutes, ui.hours),
    ].map(esc).join(','))
    const csv  = '\uFEFF' + [headers, ...rowLines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `rapport-absences-${dateFrom}-${dateTo}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

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
        {([
          { key: 'charts'  as MainTab, label: ui.tabStats   },
          { key: 'details' as MainTab, label: ui.tabDetails },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${mainTab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {mainTab === 'charts' && (
        <div className="space-y-4 sm:space-y-6">
          <ReportCharts
            loading={loading} groupStats={groupStats} reasonData={reasonData}
            barTitle={ui.barTitle} pieTitle={ui.pieTitle}
            noData={ui.noData} noAbsence={ui.noAbsence} rateLabel={ui.colRate}
          />
          <ReportStatsTables
            loading={loading} statTab={statTab} setStatTab={setStatTab}
            groupStats={groupStats} studentStats={studentStats} isRtl={isRtl}
            labels={{ byGroup: ui.byGroup, byStudent: ui.byStudent, colGroup: ui.colGroup,
              colPresent: ui.colPresent, colLate: ui.colLate, colAbsent: ui.colAbsent,
              colHours: ui.colHours, colRate: ui.colRate, colStudent: ui.colStudent,
              colClass: ui.colClass, atRisk: ui.atRisk, records: ui.records,
              hours: ui.hours, noData: ui.noData }}
          />
        </div>
      )}

      {/* Details tab */}
      {mainTab === 'details' && (
        <ReportDetailsTable
          loading={loading} absenceRows={absenceRows}
          filteredAbsences={filteredAbsences} filterType={filterType}
          setFilterType={setFilterType} onExport={handleExportCsv}
          isRtl={isRtl} dateLocale={dateLocale}
          labels={{ allFilter: ui.allFilter, absentsFilter: ui.absentsFilter,
            latesFilter: ui.latesFilter, exportCsv: ui.exportCsv,
            noRecords: ui.noRecords, adjustFilters: ui.adjustFilters,
            colStudent: ui.colStudent, colClass: ui.colClass, colCourse: ui.colCourse,
            colDate: ui.colDate, colType: ui.colType, colHours: ui.colHours,
            colReason: ui.colReason, colState: ui.colState,
            absentBadge: ui.absentBadge, lateBadge: ui.lateBadge,
            justified: ui.justified, notJustified: ui.notJustified, hours: ui.hours }}
        />
      )}
    </div>
  )
}
