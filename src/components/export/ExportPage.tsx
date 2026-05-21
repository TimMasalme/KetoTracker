import { useState, useMemo } from 'react'
import { useKetoStore } from '@/store'
import { t } from '@/i18n'
import { netCarbs } from '@/utils/calculations'
import { Download, FileText, Table2, CheckCircle2, ChevronDown, ChevronRight, Upload, AlertTriangle, Utensils, Timer, Scale, Dumbbell, BarChart2, Leaf, Globe, HardDrive, FolderOpen } from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────
function escCsv(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return ''
  const s = String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
}
function toCsv(headers: string[], rows: (string | number | undefined | null)[][]): string {
  return [headers, ...rows].map((r) => r.map(escCsv).join(',')).join('\r\n')
}
async function shareOrDownload(content: string, filename: string, mime: string) {
  // Capacitor native (Android / iOS)
  const cap = (window as any)['Capacitor']
  if (cap && cap.isNative) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      // Encode to UTF-8 bytes then base64 (handles umlauts and all Unicode)
      const encoder = new TextEncoder()
      const bytes = encoder.encode('\uFEFF' + content)
      const b64 = btoa(String.fromCharCode(...Array.from(bytes)))
      await Filesystem.writeFile({ path: filename, data: b64, directory: Directory.Cache })
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
      await Share.share({ title: filename, url: uri })
      return
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return
      console.error('Capacitor export error', e)
    }
  }
  // Web Share API (iOS Safari 15+, desktop Chrome)
  const blob = new Blob(['\uFEFF' + content], { type: mime + ';charset=utf-8;' })
  if (navigator.canShare && navigator.share) {
    const file = new File([blob], filename, { type: mime })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename })
        return
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return
      }
    }
  }
  // Browser download fallback
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function openHtmlInBrowser(content: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
function formatDuration(startIso: string, endIso?: string): string {
  if (!endIso) return 'läuft noch'
  const h = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000
  return `${Math.floor(h)}h ${Math.round((h - Math.floor(h)) * 60)}m`
}
function localDateKey(d: Date = new Date()) { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function todayStr() { return localDateKey() }

type Period = 'all' | 'month' | 'week' | 'today'

function periodStart(p: Period): string | null {
  const now = new Date()
  if (p === 'all') return null
  if (p === 'today') return todayStr()
  if (p === 'week') {
    const d = new Date(now); d.setDate(now.getDate() - 6); return localDateKey(d)
  }
  // month
  const d = new Date(now); d.setDate(now.getDate() - 29); return localDateKey(d)
}

function filterByPeriod<T extends { date: string }>(arr: T[], p: Period): T[] {
  const start = periodStart(p)
  if (!start) return arr
  return arr.filter((e) => e.date >= start)
}

export default function ExportPage() {
  const foodLog         = useKetoStore((s) => s.foodLog)
  const weightLog       = useKetoStore((s) => s.weightLog)
  const fastingSessions = useKetoStore((s) => s.fastingSessions)
  const sportLog        = useKetoStore((s) => s.sportLog)
  const profile         = useKetoStore((s) => s.profile)
  const macroTargets    = useKetoStore((s) => s.macroTargets)
  const recipes         = useKetoStore((s) => s.recipes)
  const activeFasting   = useKetoStore((s) => s.activeFasting)
  const lang            = useKetoStore((s) => s.lang)
  const tr              = t[lang]

  const setProfile      = useKetoStore((s) => s.setProfile)
  const setMacroTargets = useKetoStore((s) => s.setMacroTargets)

  const [period, setPeriod] = useState<Period>('all')
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [showAllMeals, setShowAllMeals] = useState(false)

  const allSessions = activeFasting ? [...fastingSessions, activeFasting] : fastingSessions

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredFood    = useMemo(() => filterByPeriod(foodLog, period), [foodLog, period])
  const filteredSport   = useMemo(() => filterByPeriod(sportLog, period), [sportLog, period])
  const filteredWeight  = useMemo(() => filterByPeriod(weightLog, period), [weightLog, period])
  const filteredFasting = useMemo(() => {
    const start = periodStart(period)
    if (!start) return allSessions
    return allSessions.filter((s) => s.startTime.slice(0, 10) >= start)
  }, [allSessions, period])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalDays = new Set(filteredFood.map((e) => e.date)).size
  const ketoDays = useMemo(() => {
    const byDay: Record<string, { carbs: number; fiber: number }> = {}
    filteredFood.forEach((e) => {
      if (!byDay[e.date]) byDay[e.date] = { carbs: 0, fiber: 0 }
      byDay[e.date].carbs += e.carbsG; byDay[e.date].fiber += e.fiberG ?? 0
    })
    return Object.values(byDay).filter((d) => netCarbs(d.carbs, d.fiber) <= macroTargets.carbsG).length
  }, [filteredFood, macroTargets.carbsG])

  // ── Grouped meals by date ─────────────────────────────────────────────────
  const mealsByDate = useMemo(() => {
    const map: Record<string, typeof filteredFood> = {}
    filteredFood.forEach((e) => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)) // newest first
  }, [filteredFood])

  function toggleDate(date: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  const periodLabels: Record<Period, string> = {
    all: tr.allTime, month: tr.lastMonth, week: tr.lastWeek, today: tr.today,
  }

  // ── Export functions (use filtered data) ──────────────────────────────────
  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportSuccess(false)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        // Validate basic structure
        if (!data.foodLog || !data.weightLog || !data.fastingSessions || !data.sportLog) {
          setImportError(lang === 'de'
            ? 'Ungültige Backup-Datei – fehlende Felder.'
            : 'Invalid backup file – missing fields.')
          return
        }
        // Write directly to localStorage (same key as zustand persist)
        const existing = JSON.parse(localStorage.getItem('keto-tracker-store') || '{}')
        const merged = {
          ...existing,
          state: {
            ...existing.state,
            foodLog: data.foodLog ?? [],
            weightLog: data.weightLog ?? [],
            fastingSessions: data.fastingSessions ?? [],
            sportLog: data.sportLog ?? [],
            recipes: data.recipes ?? existing.state?.recipes ?? [],
            ...(data.profile ? { profile: data.profile } : {}),
            ...(data.macroTargets ? { macroTargets: data.macroTargets } : {}),
          }
        }
        localStorage.setItem('keto-tracker-store', JSON.stringify(merged))
        setImportSuccess(true)
        setTimeout(() => window.location.reload(), 1200)
      } catch {
        setImportError(lang === 'de'
          ? 'Fehler beim Lesen der Datei. Ist es eine gültige JSON-Datei?'
          : 'Error reading file. Is it a valid JSON file?')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // reset so same file can be re-imported
  }

  async function exportFood() {
    const sorted = [...filteredFood].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    const headers = lang === 'de'
      ? ['Datum','Uhrzeit','Mahlzeit','Kalorien (kcal)','Fett (g)','Protein (g)','Carbs gesamt (g)','Ballaststoffe (g)','Netto-Carbs (g)','Notiz']
      : ['Date','Time','Meal','Calories (kcal)','Fat (g)','Protein (g)','Total Carbs (g)','Fiber (g)','Net Carbs (g)','Notes']
    shareOrDownload(toCsv(headers, sorted.map((e) => [
      e.date, e.time, e.name, Math.round(e.kcal),
      +(e.fatG.toFixed(1)), +(e.proteinG.toFixed(1)), +(e.carbsG.toFixed(1)),
      +((e.fiberG ?? 0).toFixed(1)), +(netCarbs(e.carbsG, e.fiberG ?? 0).toFixed(1)), e.notes ?? '',
    ])), `KetoTrack_Food_${todayStr()}.csv`, 'text/csv')
    setLastExport(lang === 'de' ? 'Ernährungsprotokoll' : 'Food log')
  }

  async function exportSport() {
    const sorted = [...filteredSport].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    const headers = lang === 'de'
      ? ['Datum','Uhrzeit','Übung','Kategorie','Dauer (min)','Kalorien verbrannt','Notiz']
      : ['Date','Time','Exercise','Category','Duration (min)','Calories burned','Notes']
    shareOrDownload(toCsv(headers, sorted.map((e) => [
      e.date, e.time, e.name, e.category, e.durationMin, e.kcalBurned ?? '', e.notes ?? '',
    ])), `KetoTrack_Sport_${todayStr()}.csv`, 'text/csv')
    setLastExport(lang === 'de' ? 'Sport-Protokoll' : 'Exercise log')
  }

  async function exportFasting() {
    const sorted = [...filteredFasting].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const headers = lang === 'de'
      ? ['Datum','Protokoll','Start','Ende','Dauer','Ziel (h)','Abgeschlossen','Notiz']
      : ['Date','Protocol','Start','End','Duration','Target (h)','Completed','Notes']
    shareOrDownload(toCsv(headers, sorted.map((s) => [
      s.startTime.slice(0, 10), s.protocol,
      new Date(s.startTime).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB'),
      s.endTime ? new Date(s.endTime).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB') : '—',
      formatDuration(s.startTime, s.endTime), s.targetHours,
      s.completed ? (lang === 'de' ? 'Ja' : 'Yes') : (lang === 'de' ? 'Nein' : 'No'), s.notes ?? '',
    ])), `KetoTrack_Fasting_${todayStr()}.csv`, 'text/csv')
    setLastExport(lang === 'de' ? 'Fasten-Protokoll' : 'Fasting log')
  }

  async function exportWeight() {
    const sorted = [...filteredWeight].sort((a, b) => a.date.localeCompare(b.date))
    const headers = lang === 'de'
      ? ['Datum','Gewicht (kg)','Taille (cm)','Hals (cm)','Notiz']
      : ['Date','Weight (kg)','Waist (cm)','Neck (cm)','Notes']
    shareOrDownload(toCsv(headers, sorted.map((e) => [
      e.date, e.weightKg, e.waistCm ?? '', e.neckCm ?? '', e.notes ?? '',
    ])), `KetoTrack_Weight_${todayStr()}.csv`, 'text/csv')
    setLastExport(lang === 'de' ? 'Gewichtsverlauf' : 'Weight log')
  }

  async function exportHtmlReport() {
    const byDay: Record<string, { food: typeof filteredFood; sport: typeof filteredSport }> = {}
    filteredFood.forEach((e) => {
      if (!byDay[e.date]) byDay[e.date] = { food: [], sport: [] }
      byDay[e.date].food.push(e)
    })
    filteredSport.forEach((e) => {
      if (!byDay[e.date]) byDay[e.date] = { food: [], sport: [] }
      byDay[e.date].sport.push(e)
    })

    function carbColor(nc: number, max: number) {
      const p = nc / max
      if (p <= 0.5) return '#dcfce7;color:#166534'
      if (p <= 0.8) return '#fef9c3;color:#854d0e'
      if (p <= 1.0) return '#ffedd5;color:#9a3412'
      return '#fee2e2;color:#991b1b'
    }
    function kcalColor(net: number, target: number) {
      const p = net / target
      if (p >= 0.7 && p <= 1.0) return '#dcfce7;color:#166534'
      if (p > 1.0) return '#fee2e2;color:#991b1b'
      return '#dbeafe;color:#1e40af'
    }

    const periodLabel = periodLabels[period]
    const rows = Object.entries(byDay).sort().map(([date, { food, sport }]) => {
      const kcal   = Math.round(food.reduce((s, e) => s + e.kcal, 0))
      const fat    = +(food.reduce((s, e) => s + e.fatG, 0).toFixed(1))
      const prot   = +(food.reduce((s, e) => s + e.proteinG, 0).toFixed(1))
      const carbs  = +(food.reduce((s, e) => s + e.carbsG, 0).toFixed(1))
      const fiber  = +(food.reduce((s, e) => s + (e.fiberG ?? 0), 0).toFixed(1))
      const nc     = +(netCarbs(carbs, fiber).toFixed(1))
      const burned = sport.reduce((s, e) => s + (e.kcalBurned ?? 0), 0)
      const netKcal = kcal - burned
      const keto   = nc <= macroTargets.carbsG
      const cc = carbColor(nc, macroTargets.carbsG)
      const kc = kcalColor(netKcal, macroTargets.kcal)
      const d = new Date(date + 'T12:00:00').toLocaleDateString(
        lang === 'de' ? 'de-DE' : 'en-GB', { weekday:'short', day:'2-digit', month:'short' })

      const mealRows = food.sort((a,b) => a.time.localeCompare(b.time)).map(e =>
        `<tr style="background:#faf8f4"><td></td><td colspan="2" style="padding-left:24px;color:#666">${e.time} — ${e.name}</td>
         <td>${Math.round(e.kcal)}</td><td>${e.fatG.toFixed(1)}g</td><td>${e.proteinG.toFixed(1)}g</td>
         <td style="background:${carbColor(netCarbs(e.carbsG,e.fiberG??0),macroTargets.carbsG).split(';')[0]}">${netCarbs(e.carbsG,e.fiberG??0).toFixed(1)}g</td><td></td></tr>`
      ).join('')

      return `<tr class="day-row" onclick="this.nextElementSibling.hidden=!this.nextElementSibling.hidden">
        <td>${d}</td><td>${food.length}</td>
        <td style="background:${kc.split(';')[0]};${kc.split(';')[1]??''}">${netKcal} kcal${burned>0?` <small>(-${burned})</small>`:''}</td>
        <td>${fat}g</td>
        <td style="background:${prot>=macroTargets.proteinG*0.85?'#dcfce7':'#fee2e2'};color:${prot>=macroTargets.proteinG*0.85?'#166534':'#991b1b'}">${prot}g</td>
        <td style="background:${cc.split(';')[0]};${cc.split(';')[1]??''}">${nc}g / ${macroTargets.carbsG}g</td>
        <td style="text-align:center">${keto?'🟢':'🔴'}</td>
        <td style="text-align:center;color:#999;font-size:.7rem">▼</td>
      </tr>
      <tr hidden>${mealRows}</tr>`
    }).join('\n')

    const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8">
<title>KetoTracker – ${periodLabel} – ${todayStr()}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#faf8f4;color:#1a1a18;margin:0;padding:24px}
  h1{font-size:1.6rem;margin-bottom:4px}.subtitle{color:#888;margin-bottom:32px;font-size:.9rem}
  .section{background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
  h2{font-size:1rem;margin-bottom:12px;color:#333;border-bottom:1px solid #f0e9d8;padding-bottom:8px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px}
  .tile{border-radius:12px;padding:14px;text-align:center}
  .tile-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:4px}
  .tile-val{font-size:1.4rem;font-weight:700;font-family:monospace}
  table{border-collapse:collapse;width:100%;font-size:.85rem}
  th{text-align:left;padding:8px 10px;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:#888;border-bottom:2px solid #f0e9d8}
  td{padding:8px 10px;border-bottom:1px solid #f7f3ec}
  .day-row{cursor:pointer}.day-row:hover td{background:#f0e9d8!important}
  .neutral{background:#f0e9d8}.green{background:#dcfce7;color:#166534}
  small{font-size:.75em;opacity:.8}
</style></head><body>
<h1>KetoTracker – ${periodLabel}</h1>
<div class="subtitle">${lang==='de'?'Exportiert':'Exported'} ${new Date().toLocaleDateString(lang==='de'?'de-DE':'en-GB',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} · ${profile?.name??''}</div>
<div class="section"><h2>${lang==='de'?'Profil & Ziele':'Profile & Goals'}</h2>
<div class="grid">
  <div class="tile neutral"><div class="tile-label">${lang==='de'?'Keto-Tage':'Keto days'}</div><div class="tile-val">${ketoDays}/${totalDays}</div></div>
  <div class="tile neutral"><div class="tile-label">${lang==='de'?'Ziel kcal':'Target kcal'}</div><div class="tile-val">${macroTargets.kcal}</div></div>
  <div class="tile green"><div class="tile-label">${lang==='de'?'Max N-Carbs':'Max net carbs'}</div><div class="tile-val">${macroTargets.carbsG}g</div></div>
</div></div>
<div class="section"><h2>${lang==='de'?'Tagesübersicht':'Daily overview'} <small style="font-weight:400;font-size:.8rem;color:#888">(${lang==='de'?'klicken zum Aufklappen':'click to expand'})</small></h2>
<table><thead><tr>
  <th>${lang==='de'?'Datum':'Date'}</th><th>${lang==='de'?'Mahlz.':'Meals'}</th>
  <th>${lang==='de'?'Netto kcal':'Net kcal'}</th><th>${lang==='de'?'Fett':'Fat'}</th>
  <th>${lang==='de'?'Protein':'Protein'}</th><th>${lang==='de'?'N-Carbs':'Net carbs'}</th>
  <th>${lang==='de'?'Ketose?':'Keto?'}</th><th></th>
</tr></thead><tbody>${rows}</tbody></table></div>
<p style="text-align:center;color:#aaa;font-size:.75rem;margin-top:32px">KetoTracker – ${new Date().toLocaleString(lang==='de'?'de-DE':'en-GB')}</p>
</body></html>`

    shareOrDownload(html, `KetoTrack_${periodLabel.replace(/\s/g,'_')}_${todayStr()}.html`, 'text/html')
    setLastExport(lang === 'de' ? 'HTML-Bericht' : 'HTML report')
  }

  async function exportJson() {
    const data = {
      exportDate: new Date().toISOString(),
      profile,
      macroTargets,
      foodLog,          // alle, nicht gefiltert
      weightLog,
      fastingSessions: activeFasting
        ? [...fastingSessions, activeFasting]
        : fastingSessions,
      sportLog,
      recipes,
    }
    shareOrDownload(JSON.stringify(data, null, 2), `KetoTrack_Backup_${todayStr()}.json`, 'application/json')
    setLastExport('JSON-Backup')
  }

  const exportActions = [
    { icon: 'food', title: lang==='de'?'Ernährungsprotokoll':'Food log', desc: `${filteredFood.length} ${lang==='de'?'Mahlzeiten':'meals'}`, action: exportFood },
    { icon: 'fasting', title: lang==='de'?'Fasten-Protokoll':'Fasting log', desc: `${filteredFasting.length} ${lang==='de'?'Sitzungen':'sessions'}`, action: exportFasting },
    { icon: 'weight', title: lang==='de'?'Gewichtsverlauf':'Weight log', desc: `${filteredWeight.length} ${lang==='de'?'Messungen':'entries'}`, action: exportWeight },
    { icon: 'sport', title: lang==='de'?'Sport-Protokoll':'Exercise log', desc: `${filteredSport.length} ${lang==='de'?'Einheiten':'sessions'}`, action: exportSport },
  ]

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">{tr.exportTitle}</h2>

      {/* Period filter */}
      <div className="card-sm">
        <p className="text-xs font-semibold text-cream-400 mb-2">{tr.period}</p>
        <div className="flex gap-2 flex-wrap">
          {(['all','month','week','today'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                ${period === p ? 'bg-charcoal-900 text-cream-50' : 'bg-cream-100 hover:bg-cream-200 text-charcoal-800'}`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: tr.daysTracked,     value: totalDays },
          { label: tr.ketoDaysLabel,   value: ketoDays },
          { label: tr.fastingSessions, value: filteredFasting.filter((s) => s.completed).length },
          { label: tr.sportSessions,   value: filteredSport.length },
        ].map((s) => (
          <div key={s.label} className="card-sm text-center">
            <p className="font-mono text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-cream-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Meals by date – collapsible, last 5 visible + show all */}
      <div className="card space-y-2">
        <h3 className="font-semibold text-sm">{tr.mealsTitle}</h3>
        {mealsByDate.length === 0 ? (
          <p className="text-xs text-cream-400 py-4 text-center">{tr.noData}</p>
        ) : (
          (showAllMeals ? mealsByDate : mealsByDate.slice(0, 5)).map(([date, entries]) => {
            const isOpen = expandedDates.has(date)
            const totalKcal = Math.round(entries.reduce((s, e) => s + e.kcal, 0))
            const totalNC   = +(entries.reduce((s, e) => s + netCarbs(e.carbsG, e.fiberG ?? 0), 0).toFixed(1))
            const ketoDay   = totalNC <= macroTargets.carbsG
            const d = new Date(date + 'T12:00:00').toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
            })
            return (
              <div key={date} className="border border-cream-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-cream-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={14} className="text-cream-400"/> : <ChevronRight size={14} className="text-cream-400"/>}
                    <span className="text-sm font-medium">{d}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5
                      ${ketoDay ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {ketoDay ? <><Leaf size={9} /> Keto</> : <AlertTriangle size={9} />}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-cream-400 font-mono">
                    <span>{totalKcal} kcal</span>
                    <span>{totalNC}g NC</span>
                    <span className="text-[10px]">{entries.length} {lang==='de'?'Einträge':'entries'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-cream-200 divide-y divide-cream-100">
                    {entries.sort((a, b) => a.time.localeCompare(b.time)).map((e) => (
                      <div key={e.id} className="flex justify-between px-4 py-2 text-xs">
                        <div>
                          <span className="font-medium">{e.name}</span>
                          {e.notes && <span className="text-cream-400 ml-1">· {e.notes}</span>}
                        </div>
                        <span className="text-cream-400 font-mono shrink-0 ml-2">
                          {Math.round(e.kcal)} kcal · {netCarbs(e.carbsG, e.fiberG ?? 0).toFixed(1)}g NC · {e.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
        {/* Show all / collapse divider */}
        {mealsByDate.length > 5 && (
          <div className="pt-1">
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-cream-200" />
              <button
                onClick={() => setShowAllMeals((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-cream-400 hover:text-charcoal-700 transition-colors shrink-0 font-medium"
              >
                {showAllMeals
                  ? (lang === 'de' ? 'Weniger anzeigen' : 'Show less')
                  : (lang === 'de'
                      ? `Alle ${mealsByDate.length} Tage anzeigen`
                      : `Show all ${mealsByDate.length} days`)}
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${showAllMeals ? 'rotate-180' : ''}`}
                />
              </button>
              <div className="flex-1 h-px bg-cream-200" />
            </div>
          </div>
        )}
      </div>

      {/* Full report */}
      <div className="card border-2 border-accent-green/30 bg-green-50/30 space-y-3">
        <div className="flex items-start gap-3">
          <BarChart2 size={22} className="text-charcoal-700" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{tr.fullReport}</h3>
            <p className="text-xs text-cream-400 mt-0.5">{tr.fullReportDesc}</p>
          </div>
        </div>
        <button onClick={async () => {
          // Re-use exportFood as full CSV is the same filtered data
          const sections: string[] = []
          sections.push(`=== ${lang==='de'?'ERNÄHRUNG':'FOOD'} ===`)
          const fSorted = [...filteredFood].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
          sections.push(toCsv(
            lang==='de'?['Datum','Uhrzeit','Mahlzeit','kcal','Fett (g)','Prot (g)','N-Carbs (g)']:
              ['Date','Time','Meal','kcal','Fat (g)','Prot (g)','Net Carbs (g)'],
            fSorted.map(e=>[e.date,e.time,e.name,Math.round(e.kcal),+e.fatG.toFixed(1),+e.proteinG.toFixed(1),+netCarbs(e.carbsG,e.fiberG??0).toFixed(1)])
          ))
          sections.push(`\n=== ${lang==='de'?'SPORT':'EXERCISE'} ===`)
          sections.push(toCsv(
            lang==='de'?['Datum','Übung','Dauer (min)','kcal verbrannt']:['Date','Exercise','Duration (min)','kcal burned'],
            [...filteredSport].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.name,e.durationMin,e.kcalBurned??''])
          ))
          sections.push(`\n=== ${lang==='de'?'GEWICHT':'WEIGHT'} ===`)
          sections.push(toCsv(
            lang==='de'?['Datum','Gewicht (kg)','Taille (cm)']:['Date','Weight (kg)','Waist (cm)'],
            [...filteredWeight].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.weightKg,e.waistCm??''])
          ))
          shareOrDownload(sections.join('\r\n'), `KetoTrack_Vollbericht_${todayStr()}.csv`, 'text/csv')
          setLastExport(lang==='de'?'Vollständiger Bericht':'Full report')
        }} className="btn-primary w-full flex items-center justify-center gap-2">
          <Download size={15} />{tr.exportFullBtn}
        </button>
      </div>

      {/* Individual exports */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-charcoal-900">{tr.individualExports}</h3>
        {exportActions.map((ex) => (
          <div key={ex.title} className="card-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-charcoal-700 shrink-0">
                {ex.icon === 'food'    && <Utensils size={16} />}
                {ex.icon === 'fasting' && <Timer size={16} />}
                {ex.icon === 'weight'  && <Scale size={16} />}
                {ex.icon === 'sport'   && <Dumbbell size={16} />}
              </span>
              <div>
                <p className="text-sm font-medium">{ex.title}</p>
                <p className="text-xs text-cream-400">{ex.desc}</p>
              </div>
            </div>
            <button onClick={ex.action} className="btn-secondary shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5">
              <Table2 size={13} /> CSV
            </button>
          </div>
        ))}
      </div>

      {/* HTML report */}
      <div className="card border-2 border-blue-200/50 bg-blue-50/20 space-y-3">
        <div className="flex items-start gap-3">
          <Globe size={22} className="text-blue-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{tr.htmlReport}</h3>
            <p className="text-xs text-cream-400 mt-0.5">{tr.htmlReportDesc}</p>
          </div>
        </div>
        <button onClick={exportHtmlReport} className="btn-secondary w-full flex items-center justify-center gap-2">
          <Download size={15} />{tr.exportHtmlBtn}
        </button>
      </div>

      {/* JSON backup */}
      <div className="card-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-charcoal-700 shrink-0"><HardDrive size={16} /></span>
          <div>
            <p className="text-sm font-medium">{tr.backup}</p>
            <p className="text-xs text-cream-400">{tr.backupDesc}</p>
          </div>
        </div>
        <button onClick={exportJson} className="btn-secondary shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5">
          <FileText size={13} /> JSON
        </button>
      </div>

      {/* JSON import */}
      <div className="card-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-cream-100 flex items-center justify-center text-charcoal-700 shrink-0"><FolderOpen size={16} /></span>
          <div>
            <p className="text-sm font-medium">{lang === 'de' ? 'Backup wiederherstellen' : 'Restore backup'}</p>
            <p className="text-xs text-cream-400">{lang === 'de' ? 'JSON-Backup importieren – überschreibt aktuelle Daten' : 'Import JSON backup – overwrites current data'}</p>
          </div>
        </div>
        <label className="btn-secondary shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 cursor-pointer">
          <Upload size={13} /> {lang === 'de' ? 'Import' : 'Import'}
          <input type="file" accept=".json" className="hidden" onChange={importJson} />
        </label>
      </div>

      {importError && (
        <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 rounded-xl px-4 py-3">
          <AlertTriangle size={16} />
          <span>{importError}</span>
        </div>
      )}
      {importSuccess && (
        <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 rounded-xl px-4 py-3">
          <CheckCircle2 size={16} />
          <span>{lang === 'de' ? 'Import erfolgreich – App wird neu geladen…' : 'Import successful – reloading app…'}</span>
        </div>
      )}

      {lastExport && (
        <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 rounded-xl px-4 py-3 fade-up">
          <CheckCircle2 size={16} />
          <span><span className="font-medium">{lastExport}</span> {tr.downloaded}</span>
        </div>
      )}

      <p className="text-xs text-cream-400 text-center pb-2">{tr.csvHint}</p>
    </div>
  )
}
