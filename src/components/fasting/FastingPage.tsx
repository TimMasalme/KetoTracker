import { useState, useEffect } from 'react'
import { useKetoStore } from '@/store'
import { formatFastingTime } from '@/utils/calculations'
import { t } from '@/i18n'
import { Timer, Play, Square, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import type { FastingSession } from '@/types'

// Always uses real OS clock: computes elapsed from stored ISO timestamp
function getElapsedHours(startIso: string): number {
  const startMs = new Date(startIso).getTime()
  const nowMs   = Date.now()
  return (nowMs - startMs) / 3_600_000
}

export default function FastingPage() {
  const activeFasting        = useKetoStore((s) => s.activeFasting)
  const fastingSessions      = useKetoStore((s) => s.fastingSessions)
  const startFasting         = useKetoStore((s) => s.startFasting)
  const stopFasting          = useKetoStore((s) => s.stopFasting)
  const removeFastingSession = useKetoStore((s) => s.removeFastingSession)
  const lang                 = useKetoStore((s) => s.lang)
  const tr                   = t[lang]

  const PROTOCOLS: { id: FastingSession['protocol']; label: string; hours: number }[] = [
    { id: '16:8', label: '16:8',  hours: 16 },
    { id: '18:6', label: '18:6',  hours: 18 },
    { id: '20:4', label: '20:4',  hours: 20 },
    { id: '24h',  label: '24h',   hours: 24 },
  ]

  const [selected, setSelected] = useState<FastingSession['protocol']>('16:8')
  const [elapsed, setElapsed]   = useState(() =>
    activeFasting ? getElapsedHours(activeFasting.startTime) : 0
  )

  useEffect(() => {
    if (!activeFasting) {
      setElapsed(0)
      return
    }
    setElapsed(getElapsedHours(activeFasting.startTime))
    const id = setInterval(() => {
      setElapsed(getElapsedHours(activeFasting.startTime))
    }, 1_000)
    return () => clearInterval(id)
  }, [activeFasting])

  const target        = activeFasting
    ? activeFasting.targetHours
    : PROTOCOLS.find((p) => p.id === selected)!.hours
  const pct           = activeFasting ? Math.min(100, (elapsed / target) * 100) : 0
  const done          = elapsed >= target
  const circumference = 2 * Math.PI * 52

  const remainingH   = Math.max(0, target - elapsed)
  const remainingStr = formatFastingTime(remainingH)

  function formatStartTime(iso: string) {
    return new Date(iso).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const recent = [...fastingSessions]
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 7)

  function sessionDuration(s: FastingSession): string {
    if (!s.endTime) return '–'
    const h = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3_600_000
    return formatFastingTime(h)
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">{tr.fastingTitle}</h2>

      {/* ── Timer circle ─────────────────────────────────────────── */}
      <div className="card flex flex-col items-center py-8 gap-4">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#f0e9d8" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke={done ? '#3d6b4f' : '#1a1a18'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
              style={{ transition: 'stroke-dasharray 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {activeFasting ? (
              <>
                <span className="font-mono text-2xl font-bold leading-none">
                  {formatFastingTime(elapsed)}
                </span>
                <span className="text-xs text-cream-400 mt-1">{tr.fastingOf(target)}</span>
                <span className="text-xs text-charcoal-800 mt-0.5 font-medium">
                  {Math.round(pct)}%
                </span>
              </>
            ) : (
              <Timer size={36} className="text-cream-300" />
            )}
          </div>
        </div>

        {/* Active session info */}
        {activeFasting && (
          <div className="text-center space-y-1">
            {done ? (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <CheckCircle2 size={16} />
                {tr.fastingGoalReached}
              </div>
            ) : (
              <div className="text-sm text-cream-400 flex items-center gap-1.5">
                <Clock size={13} />
                <span className="font-mono font-medium text-charcoal-900">{tr.fastingRemaining(remainingStr)}</span>
              </div>
            )}
            <p className="text-xs text-cream-400 flex items-center justify-center gap-1">
              {tr.fastingStarted} {formatStartTime(activeFasting.startTime)}
            </p>
          </div>
        )}

        {/* Protocol selector (only when not active) */}
        {!activeFasting && (
          <div className="flex gap-2 flex-wrap justify-center">
            {PROTOCOLS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all
                  ${selected === p.id
                    ? 'bg-charcoal-900 text-cream-50 border-charcoal-900'
                    : 'border-cream-300 text-charcoal-800 hover:bg-cream-100'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Start / Stop */}
        {activeFasting ? (
          <button
            onClick={() => stopFasting()}
            className="btn flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
          >
            <Square size={14} />
            {tr.fastingStop}
          </button>
        ) : (
          <button
            onClick={() => {
              const p = PROTOCOLS.find((x) => x.id === selected)!
              startFasting(selected, p.hours)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Play size={14} />
            {tr.fastingStart}
          </button>
        )}
      </div>

      {/* ── System clock hint ────────────────────────────────────── */}
      <div className="card-sm text-xs text-cream-400 flex items-center gap-2">
        <Clock size={12} />
        {tr.fastingTimerHint}
      </div>

      {/* ── History ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{tr.fastingHistory}</h3>
        {recent.length === 0 && (
          <div className="card-sm text-center text-cream-400 text-sm py-6">
            {tr.fastingNoSessions}
          </div>
        )}
        {recent.map((s) => (
          <div key={s.id} className="card-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{tr.fastingProtocolLabel(s.protocol)}</p>
              <p className="text-xs text-cream-400 font-mono">
                {formatStartTime(s.startTime)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-mono text-sm">{sessionDuration(s)}</p>
                <span className={`text-xs ${s.completed ? 'text-green-600' : 'text-cream-400'}`}>
                  {s.completed ? tr.fastingCompleted : tr.fastingInterrupted}
                </span>
              </div>
              <button
                onClick={() => removeFastingSession(s.id)}
                className="text-cream-300 hover:text-red-400 transition-colors ml-1"
                title={tr.fastingDeleteTitle}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
