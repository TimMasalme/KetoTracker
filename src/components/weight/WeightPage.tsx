import { useState } from 'react'
import { useKetoStore } from '@/store'
import { calculateBodyFatPercent, toDateKey, formatDisplayDate } from '@/utils/calculations'
import { t } from '@/i18n'
import { Plus, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'

const emptyForm = { weightKg: '', waistCm: '', neckCm: '', notes: '' }

/** Compute 7-day SMA + body fat % per entry */
function addMovingAverage(
  sorted: { date: string; weightKg: number; waistCm?: number; neckCm?: number }[],
  profile: { heightCm: number; gender: string } | null,
  calcBF: (w: number, n: number, h: number, g?: 'male' | 'female') => number | null,
) {
  return sorted.map((entry, i) => {
    const win = sorted.slice(Math.max(0, i - 6), i + 1)
    const avg = win.reduce((s, e) => s + e.weightKg, 0) / win.length
    const ts = new Date(entry.date + 'T12:00:00').getTime()
    const kfa = entry.waistCm && entry.neckCm && profile
      ? (calcBF(entry.waistCm, entry.neckCm, profile.heightCm, profile.gender as 'male' | 'female') ?? undefined)
      : undefined
    return { ...entry, ts, avg7: Math.round(avg * 100) / 100, kfa }
  })
}

export default function WeightPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm)
  const addWeightEntry    = useKetoStore((s) => s.addWeightEntry)
  const removeWeightEntry = useKetoStore((s) => s.removeWeightEntry)
  const weightLog         = useKetoStore((s) => s.weightLog)
  const profile           = useKetoStore((s) => s.profile)
  const lang              = useKetoStore((s) => s.lang)
  const tr                = t[lang]

  const sorted    = [...weightLog].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = addMovingAverage(sorted, profile, calculateBodyFatPercent)
  const latest    = sorted.at(-1)
  const startW    = profile?.startWeightKg ?? sorted[0]?.weightKg ?? 0
  const goalW     = profile?.goalWeightKg ?? 0
  const lost      = startW - (latest?.weightKg ?? startW)

  const bodyFat = latest?.waistCm && latest?.neckCm && profile
    ? calculateBodyFatPercent(latest.waistCm, latest.neckCm, profile.heightCm, profile.gender)
    : null

  const displayDate = (d: string) => formatDisplayDate(d, lang)

  function handleSubmit() {
    if (!form.weightKg) return
    addWeightEntry({
      date:     toDateKey(),
      weightKg: parseFloat(form.weightKg),
      waistCm:  form.waistCm ? parseFloat(form.waistCm) : undefined,
      neckCm:   form.neckCm  ? parseFloat(form.neckCm)  : undefined,
      notes:    form.notes   || undefined,
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{tr.weightTitle}</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} />
          {tr.weightAddBtn}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-sm text-center">
          <div className="font-mono text-xl font-semibold">{latest?.weightKg ?? '–'}</div>
          <div className="text-[10px] text-cream-400 uppercase tracking-wide">{tr.weightCurrent}</div>
        </div>
        <div className="card-sm text-center">
          <div className={`font-mono text-xl font-semibold ${lost > 0 ? 'text-green-700' : ''}`}>
            {lost > 0 ? `-${lost.toFixed(1)}` : '0'}
          </div>
          <div className="text-[10px] text-cream-400 uppercase tracking-wide">{tr.weightLost}</div>
        </div>
        <div className="card-sm text-center">
          <div className="font-mono text-xl font-semibold">{bodyFat ?? '–'}</div>
          <div className="text-[10px] text-cream-400 uppercase tracking-wide">{tr.weightBodyFat}</div>
        </div>
      </div>

      {/* Chart */}
      {sorted.length > 1 && (() => {
        const hasKfa = chartData.some((d) => d.kfa !== undefined)
        return (
          <div className="card">
            <h3 className="text-sm font-semibold mb-3">
              {hasKfa ? tr.weightChartTitleWithKfa : tr.weightChartTitle}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 0, right: hasKfa ? 28 : 8, left: -28, bottom: 0 }}>
                <XAxis
                  dataKey="ts"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ms) => {
                    const d = new Date(ms)
                    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.`
                  }}
                  tick={{ fontSize: 10, fill: '#d4c4a0' }} tickLine={false} axisLine={false}
                />
                <YAxis
                  yAxisId="weight"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#d4c4a0' }} tickLine={false} axisLine={false}
                />
                {hasKfa && (
                  <YAxis
                    yAxisId="kfa"
                    orientation="right"
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10, fill: '#b03a2e' }} tickLine={false} axisLine={false}
                    width={36}
                  />
                )}
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #f0e9d8', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => {
                    if (name === 'kfa')      return [`${v}%`, tr.weightTooltipKfa]
                    if (name === 'avg7')     return [`${v} kg`, tr.weightTooltipAvg]
                    return [`${v} kg`, tr.weightTooltipWeight]
                  }}
                  labelFormatter={(ms) => displayDate(new Date(ms).toISOString().slice(0, 10))}
                />
                <Legend
                  formatter={(value) =>
                    value === 'avg7' ? tr.weightLegendAvg :
                    value === 'kfa'  ? tr.weightLegendKfa :
                    tr.weightLegendWeight
                  }
                  iconType="line"
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
                {goalW > 0 && (
                  <ReferenceLine yAxisId="weight" y={goalW} stroke="#3d6b4f" strokeDasharray="4 4" strokeWidth={1} />
                )}
                <Line yAxisId="weight" type="monotone" dataKey="weightKg" stroke="#1a1a18" strokeWidth={2}
                  dot={{ r: 3, fill: '#1a1a18' }} activeDot={{ r: 5 }} name="weightKg" />
                <Line yAxisId="weight" type="monotone" dataKey="avg7" stroke="#3d6b4f" strokeWidth={2}
                  dot={false} strokeDasharray="5 3" activeDot={{ r: 4 }} name="avg7" />
                {hasKfa && (
                  <Line yAxisId="kfa" type="monotone" dataKey="kfa" stroke="#b03a2e" strokeWidth={2}
                    dot={{ r: 3, fill: '#b03a2e' }} activeDot={{ r: 5 }} connectNulls={false} name="kfa" />
                )}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-cream-400 mt-1">
              {goalW > 0 && <>{tr.weightGoalHint(goalW)} · </>}
              {hasKfa && tr.weightKfaHint}
            </p>
          </div>
        )
      })()}

      {/* Form */}
      {showForm && (
        <div className="card space-y-3 fade-up">
          <h3 className="text-sm font-semibold">{tr.weightNewEntry}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">{tr.weightKgLabel}</label>
              <input className="input" type="number" step="0.1"
                value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </div>
            <div>
              <label className="label">{tr.weightWaistLabel}</label>
              <input className="input" type="number" step="0.5"
                value={form.waistCm} onChange={(e) => setForm({ ...form, waistCm: e.target.value })} />
            </div>
            <div>
              <label className="label">{tr.weightNeckLabel}</label>
              <input className="input" type="number" step="0.5"
                value={form.neckCm} onChange={(e) => setForm({ ...form, neckCm: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{tr.weightNotesLabel}</label>
            <input className="input" placeholder={tr.weightNotesPlaceholder}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="btn-primary flex-1">{tr.save}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">{tr.cancel}</button>
          </div>
        </div>
      )}

      {/* Log – all entries */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{tr.weightEntries(sorted.length)}</h3>
        {[...sorted].reverse().map((e) => (
          <div key={e.id} className="card-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium font-mono">{e.weightKg} kg</p>
              <p className="text-xs text-cream-400">
                {displayDate(e.date)}
                {e.waistCm ? ` · ${tr.weightWaistShort(e.waistCm)}` : ''}
                {e.neckCm  ? ` · ${tr.weightNeckShort(e.neckCm)}`  : ''}
              </p>
            </div>
            <button onClick={() => removeWeightEntry(e.id)}
              className="text-cream-300 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
