import { useToday, useDateRange, useCalorieSummary } from '@/hooks'
import { useKetoStore } from '@/store'
import { formatDisplayDate, netCarbs } from '@/utils/calculations'
import { t } from '@/i18n'
import MacroRing from './MacroRing'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Cell
} from 'recharts'
import { Flame, Target, TrendingDown, Circle, TrendingUp, Dumbbell } from 'lucide-react'

export default function Dashboard() {
  const { totals, netCarbsToday, rating, inKetosis, kcalBurned } = useToday()
  const targets    = useKetoStore((s) => s.macroTargets)
  const profile    = useKetoStore((s) => s.profile)
  const weightLog  = useKetoStore((s) => s.weightLog)
  const lang       = useKetoStore((s) => s.lang)
  const week       = useDateRange(7)
  const { todayDeficit, totalDeficit, tdee } = useCalorieSummary()

  const tr = t[lang]
  const displayDate = (d: string) => formatDisplayDate(d, lang)

  const RATING_CONFIG = {
    excellent: { label: tr.ratingExcellent, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    good:      { label: tr.ratingGood,      color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
    okay:      { label: tr.ratingOkay,      color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
    bad:       { label: tr.ratingBad,       color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
  }

  const rc = RATING_CONFIG[rating]
  const sortedWeight  = [...weightLog].sort((a,b) => a.date.localeCompare(b.date))
  const latestWeight  = sortedWeight.at(-1)
  const oldestWeight  = sortedWeight[0]
  const startWeight   = profile?.startWeightKg ?? oldestWeight?.weightKg ?? 0
  const currentWeight = latestWeight?.weightKg ?? startWeight
  const lost = startWeight - currentWeight

  const grossKcal = totals.kcal
  const netKcal   = totals.kcal - kcalBurned
  const kcalPct   = Math.min(100, (grossKcal / targets.kcal) * 100)
  const netKcalPct = Math.min(100, (netKcal / targets.kcal) * 100)

  const isDeficit  = todayDeficit >= 0
  const isTotalDef = totalDeficit >= 0

  // ── Fat loss & progress calcs ─────────────────────────────────────────────
  const month      = useDateRange(30)
  const goalWeight = profile?.goalWeightKg ?? 0
  const kgToGoal   = Math.max(0, currentWeight - goalWeight)
  const kcalPerKg  = 7700
  const kcalToNextKg = kcalPerKg - (totalDeficit % kcalPerKg)
  const fatLostKg  = totalDeficit > 0 ? +(totalDeficit / kcalPerKg).toFixed(2) : 0
  const activeDays14 = month.slice(-14).filter((d) => d.kcal > 0)
  const avgDeficit14 = activeDays14.length > 0
    ? activeDays14.reduce((s, d) => s + (tdee - (d.kcal - d.kcalBurned)), 0) / activeDays14.length
    : 0
  const daysToGoal = avgDeficit14 > 0 ? Math.ceil(kgToGoal * kcalPerKg / avgDeficit14) : null

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-charcoal-900">
            {tr.greetingPrefix} {profile?.name ?? tr.greetingFallback}
          </h2>
          <p className="text-sm text-cream-400 mt-0.5">
            {new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
          inKetosis
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {inKetosis ? `🟢 ${tr.inKetosis}` : `🔴 ${tr.outOfKetosis}`}
        </span>
      </div>

      {/* ── Day rating banner ───────────────────────────────────── */}
      <div className={`card-sm border ${rc.bg}`}>
        <p className={`text-sm font-semibold ${rc.color}`}>{rc.label}</p>
        <p className="text-xs text-cream-400 mt-0.5">
          {tr.todaySummary}: {Math.round(netKcal)} kcal {tr.nettoLabel} · {netCarbsToday}g {tr.netCarbsLabel} · {Math.round(totals.proteinG)}g {tr.proteinLabel}
          {kcalBurned > 0 && <span className="text-green-600 inline-flex items-center gap-1"> · <Dumbbell size={12} /> -{kcalBurned} {tr.exerciseShort}</span>}
        </p>
      </div>

      {/* ── Calorie bars ────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-charcoal-900">{tr.caloriesTitle}</h3>

        {/* Intake bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">{tr.calorieIntake}</span>
            <span className="font-mono text-cream-400">{Math.round(grossKcal)} / {targets.kcal} kcal</span>
          </div>
          <div className="h-3 bg-cream-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${grossKcal > targets.kcal ? 'bg-red-400' : 'bg-charcoal-800'}`}
              style={{ width: `${kcalPct}%` }}
            />
          </div>
        </div>

        {/* Net calorie bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium">
              {tr.netCalories}
              {kcalBurned > 0 && (
                <span className="text-green-600 ml-1">(-{kcalBurned} {tr.exerciseShort})</span>
              )}
            </span>
            <span className="font-mono text-cream-400">{Math.round(netKcal)} / {targets.kcal} kcal</span>
          </div>
          <div className="h-3 bg-cream-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                netKcal > targets.kcal ? 'bg-red-400' :
                netKcal < targets.kcal * 0.7 ? 'bg-blue-400' :
                'bg-accent-green'
              }`}
              style={{ width: `${netKcalPct}%` }}
            />
          </div>
          <p className="text-[10px] text-cream-400 mt-1">
            {netKcal <= targets.kcal
              ? tr.kcalHeadroom(Math.round(targets.kcal - netKcal))
              : tr.kcalOverGoal(Math.round(netKcal - targets.kcal))}
          </p>
        </div>
      </div>

      {/* ── Macro rings ─────────────────────────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold text-charcoal-900 mb-4">{tr.macrosToday}</h3>
        <div className="grid grid-cols-4 gap-2">
          <MacroRing label={tr.fatLabel}      current={Math.round(totals.fatG)}     target={targets.fatG}     unit="g" color="#c49a2a" />
          <MacroRing label={tr.proteinLabel}  current={Math.round(totals.proteinG)} target={targets.proteinG} unit="g" color="#3d6b4f" />
          <MacroRing label={tr.nCarbs}        current={Math.round(netCarbsToday)}   target={targets.carbsG}   unit="g" color="#b03a2e" invertColor />
          <MacroRing label={`${tr.nettoLabel} kcal`} current={Math.round(netKcal)} target={targets.kcal}     unit=""  color="#1a1a18" />
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today deficit */}
        <div className="card-sm text-center">
          {isDeficit
            ? <TrendingDown size={18} className="mx-auto text-green-500 mb-1" />
            : <TrendingUp   size={18} className="mx-auto text-red-400  mb-1" />}
          <div className={`font-mono text-lg font-semibold ${isDeficit ? 'text-green-600' : 'text-red-500'}`}>
            {isDeficit ? '-' : '+'}{Math.abs(Math.round(todayDeficit))}
          </div>
          <div className="text-[10px] text-cream-400 uppercase tracking-wide">{tr.deficitToday}</div>
          <div className="text-[9px] text-cream-300">TDEE {tdee} kcal</div>
        </div>
        {/* Total deficit */}
        <div className="card-sm text-center">
          {isTotalDef
            ? <TrendingDown size={18} className="mx-auto text-green-500 mb-1" />
            : <TrendingUp   size={18} className="mx-auto text-red-400  mb-1" />}
          <div className={`font-mono text-lg font-semibold ${isTotalDef ? 'text-green-600' : 'text-red-500'}`}>
            {isTotalDef ? '-' : '+'}{Math.abs(Math.round(totalDeficit))}
          </div>
          <div className="text-[10px] text-cream-400 uppercase tracking-wide">{tr.deficitTotal}</div>
        </div>
        {/* Exercise */}
        <div className="card-sm text-center">
          <Flame size={18} className="mx-auto text-orange-400 mb-1" />
          <div className="font-mono text-lg font-semibold">{kcalBurned}</div>
          <div className="text-[10px] text-cream-400 uppercase tracking-wide">{tr.kcalExercise}</div>
        </div>
        {/* Weight change */}
        <div className="card-sm text-center">
          <Target size={18} className="mx-auto text-blue-400 mb-1" />
          <div className={`font-mono text-lg font-semibold ${lost < 0 ? 'text-red-500' : ''}`}>
            {lost < 0 ? `+${Math.abs(lost).toFixed(1)}` : lost.toFixed(1)}kg
          </div>
          <div className="text-[10px] text-cream-400 uppercase tracking-wide">
            {lost < 0 ? tr.gainedWeight : tr.lostWeight}
          </div>
        </div>
      </div>

      {/* ── 7-day Net-Carb chart ─────────────────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">{tr.netCarbs7d}</h3>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={week} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id="carbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#b03a2e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#b03a2e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={(d) => displayDate(d).split(' ')[0]}
              tick={{ fontSize: 10, fill: '#d4c4a0' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#d4c4a0' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'white', border: '1px solid #f0e9d8', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [`${v}g`, tr.netCarbsLabel]}
              labelFormatter={displayDate}
            />
            <Area type="monotone" dataKey={() => targets.carbsG}
              stroke="#d4c4a0" strokeDasharray="4 4" strokeWidth={1} fill="none" dot={false} />
            <Area type="monotone" dataKey="netCarbsG"
              stroke="#b03a2e" strokeWidth={2} fill="url(#carbGrad)" dot={{ r: 3, fill: '#b03a2e' }} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-cream-400 mt-1">{tr.carbsLimitHint(targets.carbsG)}</p>
      </div>

      {/* ── 7-day rating row ────────────────────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">{tr.dayRatings}</h3>
        <div className="flex justify-between gap-1">
          {week.map((d) => (
            <div key={d.date} className="flex flex-col items-center gap-1">
              <Circle
                size={12}
                className={
                  d.rating === 'excellent' ? 'text-green-600 fill-green-500' :
                  d.rating === 'good'      ? 'text-green-500 fill-green-300' :
                  d.rating === 'okay'      ? 'text-yellow-500 fill-yellow-300' :
                                            'text-red-400 fill-red-200'
                }
              />
              <span className="text-[9px] text-cream-400">
                {displayDate(d.date).slice(0, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fat loss & progress ──────────────────────────────────── */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-charcoal-900 flex items-center gap-1.5"><TrendingDown size={14} /> {tr.fatLossProgress}</h3>

        {/* Fat tiles */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-cream-400 uppercase tracking-wide mb-1">{tr.fatLostTile}</p>
            <p className="font-mono text-lg font-bold text-orange-600">{fatLostKg} kg</p>
            <p className="text-[9px] text-cream-300">{tr.totalKcalShort(Math.round(totalDeficit).toLocaleString(lang === 'de' ? 'de' : 'en'))}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-cream-400 uppercase tracking-wide mb-1">{tr.toNextKgTile}</p>
            <p className="font-mono text-lg font-bold text-blue-600">
              {totalDeficit > 0 ? Math.round(kcalToNextKg).toLocaleString(lang === 'de' ? 'de' : 'en') : '–'}
            </p>
            <p className="text-[9px] text-cream-300">{tr.kcalStillNeeded}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-cream-400 uppercase tracking-wide mb-1">{tr.toGoalTile}</p>
            <p className="font-mono text-lg font-bold text-green-600">
              {daysToGoal ? `~${daysToGoal}d` : '–'}
            </p>
            <p className="text-[9px] text-cream-300">{tr.avg14d(Math.round(avgDeficit14))}</p>
            <p className="text-[9px] text-cream-300">{tr.todayKcal(Math.round(todayDeficit))}</p>
          </div>
        </div>

        {/* Progress bar to goal */}
        {profile && goalWeight > 0 && startWeight > goalWeight && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-cream-400">{tr.startWeightLabel(startWeight)}</span>
              <span className="font-medium">{currentWeight} kg</span>
              <span className="text-cream-400">{tr.goalWeightLabel(goalWeight)}</span>
            </div>
            <div className="h-3 bg-cream-100 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (lost / (startWeight - goalWeight)) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-cream-400 mt-1 text-center">
              {tr.goalReached(((lost / (startWeight - goalWeight)) * 100).toFixed(1))}
            </p>
          </div>
        )}
      </div>

      {/* ── 30-day deficit chart ─────────────────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-1">{tr.dailyDeficit30d}</h3>
        <p className="text-[10px] text-cream-400 mb-3">{tr.deficitChartHint(tdee)}</p>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={month} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barSize={6}>
            <XAxis dataKey="date"
              tickFormatter={(d) => {
                const day = new Date(d + 'T12:00:00').getDate()
                return day % 5 === 0 ? String(day) : ''
              }}
              tick={{ fontSize: 9, fill: '#d4c4a0' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#d4c4a0' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: 'white', border: '1px solid #f0e9d8', borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [`${v > 0 ? '+' : ''}${Math.round(v)} kcal`, tr.deficitTooltip]}
              labelFormatter={displayDate}
            />
            <ReferenceLine y={0} stroke="#d4c4a0" strokeDasharray="3 3" />
            <Bar dataKey={(d) => {
              if (d.kcal === 0) return null
              return tdee - (d.kcal - d.kcalBurned)
            }} radius={[3, 3, 0, 0]}>
              {month.map((d, i) => {
                if (d.kcal === 0) return <Cell key={i} fill="transparent" />
                const def = tdee - (d.kcal - d.kcalBurned)
                return <Cell key={i} fill={def >= 0 ? '#3d6b4f' : '#b03a2e'} fillOpacity={0.75} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
