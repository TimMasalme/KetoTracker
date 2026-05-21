import { useState, useMemo } from 'react'
import { useKetoStore } from '@/store'
import { t, type Translations } from '@/i18n'
import { ChevronLeft, ChevronRight, Pencil, Trash2, X, Check, Leaf, AlertTriangle, Dumbbell, Timer } from 'lucide-react'
import { sumMacros, netCarbs } from '@/utils/calculations'
import type { MacroEntry, SportEntry, FastingSession } from '@/types'

function toKey(d: Date) { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}` }
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }

const WEEKDAYS_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ─── Edit modals ──────────────────────────────────────────────────────────────
function FoodEditModal({ entry, onSave, onClose, tr }: {
  entry: MacroEntry
  onSave: (updates: Partial<Omit<MacroEntry,'id'>>) => void
  onClose: () => void
  tr: Translations
}) {
  const [form, setForm] = useState({
    name: entry.name, time: entry.time,
    kcal: String(entry.kcal), fatG: String(entry.fatG), proteinG: String(entry.proteinG),
    carbsG: String(entry.carbsG), fiberG: String(entry.fiberG ?? 0), notes: entry.notes ?? '',
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{tr.editEntry}</h3>
          <button onClick={onClose} className="p-1 hover:bg-cream-100 rounded-lg"><X size={18}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-cream-400">{tr.name}</span>
            <input className="input w-full" value={form.name} onChange={f('name')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.time}</span>
            <input className="input w-full" type="time" value={form.time} onChange={f('time')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.kcal}</span>
            <input className="input w-full" type="number" value={form.kcal} onChange={f('kcal')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.fatG}</span>
            <input className="input w-full" type="number" step="0.1" value={form.fatG} onChange={f('fatG')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.proteinG}</span>
            <input className="input w-full" type="number" step="0.1" value={form.proteinG} onChange={f('proteinG')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.carbsG}</span>
            <input className="input w-full" type="number" step="0.1" value={form.carbsG} onChange={f('carbsG')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.fiberG}</span>
            <input className="input w-full" type="number" step="0.1" value={form.fiberG} onChange={f('fiberG')} />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-cream-400">{tr.notes}</span>
            <textarea className="input w-full text-sm" rows={2} value={form.notes} onChange={f('notes')} />
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">{tr.cancel}</button>
          <button onClick={() => { onSave({
            ...form,
            kcal: parseFloat(form.kcal) || 0,
            fatG: parseFloat(form.fatG) || 0,
            proteinG: parseFloat(form.proteinG) || 0,
            carbsG: parseFloat(form.carbsG) || 0,
            fiberG: parseFloat(form.fiberG) || 0,
          }); onClose() }} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
            <Check size={14}/>{tr.save}
          </button>
        </div>
      </div>
    </div>
  )
}

function SportEditModal({ entry, onSave, onClose, tr }: {
  entry: SportEntry
  onSave: (updates: Partial<Omit<SportEntry,'id'>>) => void
  onClose: () => void
  tr: Translations
}) {
  const [form, setForm] = useState({
    name: entry.name, time: entry.time,
    durationMin: String(entry.durationMin), kcalBurned: String(entry.kcalBurned ?? ''), notes: entry.notes ?? '',
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{tr.editSport}</h3>
          <button onClick={onClose} className="p-1 hover:bg-cream-100 rounded-lg"><X size={18}/></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-cream-400">{tr.name}</span>
            <input className="input w-full" value={form.name} onChange={f('name')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.time}</span>
            <input className="input w-full" type="time" value={form.time} onChange={f('time')} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-cream-400">{tr.durationMin}</span>
            <input className="input w-full" type="number" value={form.durationMin} onChange={f('durationMin')} />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-cream-400">{tr.kcalBurned}</span>
            <input className="input w-full" type="number" value={form.kcalBurned} onChange={f('kcalBurned')} />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-cream-400">{tr.notes}</span>
            <textarea className="input w-full text-sm" rows={2} value={form.notes} onChange={f('notes')} />
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">{tr.cancel}</button>
          <button onClick={() => { onSave({
            ...form,
            durationMin: parseInt(form.durationMin) || 0,
            kcalBurned: form.kcalBurned ? parseFloat(form.kcalBurned) : undefined,
          }); onClose() }} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
            <Check size={14}/>{tr.save}
          </button>
        </div>
      </div>
    </div>
  )
}

function FastingEditModal({ session, onSave, onClose, tr }: {
  session: FastingSession
  onSave: (updates: Partial<FastingSession>) => void
  onClose: () => void
  tr: Translations
}) {
  const [notes, setNotes] = useState(session.notes ?? '')
  const [targetHours, setTargetHours] = useState(session.targetHours)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{tr.editFasting}</h3>
          <button onClick={onClose} className="p-1 hover:bg-cream-100 rounded-lg"><X size={18}/></button>
        </div>
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-cream-400">{tr.protocol}</span>
            <input className="input w-full" value={session.protocol} readOnly />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-cream-400">{tr.targetHours}</span>
            <input className="input w-full" type="number" value={targetHours}
              onChange={(e) => setTargetHours(+e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-cream-400">{tr.notes}</span>
            <textarea className="input w-full text-sm" rows={2} value={notes}
              onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1">{tr.cancel}</button>
          <button onClick={() => { onSave({ notes, targetHours }); onClose() }}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5">
            <Check size={14}/>{tr.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onClose, tr }: {
  onConfirm: () => void; onClose: () => void; tr: Translations
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xs p-5 space-y-4 shadow-xl text-center"
        onClick={(e) => e.stopPropagation()}>
        <p className="font-medium text-sm">{tr.deleteConfirm}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">{tr.cancel}</button>
          <button onClick={() => { onConfirm(); onClose() }}
            className="flex-1 py-2 px-4 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
            {tr.delete}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date()
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<string>(toKey(today))

  const lang               = useKetoStore((s) => s.lang)
  const tr                 = t[lang]
  const foodLog            = useKetoStore((s) => s.foodLog)
  const macroTargets       = useKetoStore((s) => s.macroTargets)
  const sportLog           = useKetoStore((s) => s.sportLog)
  const fastingSessions    = useKetoStore((s) => s.fastingSessions)
  const updateFoodEntry    = useKetoStore((s) => s.updateFoodEntry)
  const removeFoodEntry    = useKetoStore((s) => s.removeFoodEntry)
  const updateSportEntry   = useKetoStore((s) => s.updateSportEntry)
  const removeSportEntry   = useKetoStore((s) => s.removeSportEntry)
  const updateFastingSession = useKetoStore((s) => s.updateFastingSession)
  const removeFastingSession = useKetoStore((s) => s.removeFastingSession)

  // Edit/delete modal state
  type Modal =
    | { type: 'food'; entry: MacroEntry }
    | { type: 'sport'; entry: SportEntry }
    | { type: 'fasting'; session: FastingSession }
    | { type: 'delete'; onConfirm: () => void }
    | null
  const [modal, setModal] = useState<Modal>(null)

  const WEEKDAYS = lang === 'de' ? WEEKDAYS_DE : WEEKDAYS_EN
  const MONTHS   = lang === 'de' ? MONTHS_DE   : MONTHS_EN

  const logMap = useMemo(() => {
    const map: Record<string, MacroEntry[]> = {}
    foodLog.forEach((e) => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e) })
    return map
  }, [foodLog])

  const daysInMonth = getDaysInMonth(view.year, view.month)
  const firstDay    = getFirstDay(view.year, view.month)

  function prevMonth() {
    setView((v) => ({ year: v.month === 0 ? v.year - 1 : v.year, month: v.month === 0 ? 11 : v.month - 1 }))
  }
  function nextMonth() {
    setView((v) => ({ year: v.month === 11 ? v.year + 1 : v.year, month: v.month === 11 ? 0 : v.month + 1 }))
  }

  function getDayStatus(dateKey: string) {
    const entries = logMap[dateKey]
    if (!entries?.length) return 'empty'
    const totals = sumMacros(entries)
    return netCarbs(totals.carbsG, totals.fiberG) <= macroTargets.carbsG ? 'keto' : 'logged'
  }

  const selectedEntries = logMap[selected] ?? []
  const selectedTotals  = sumMacros(selectedEntries)
  const selectedNetCarbs = netCarbs(selectedTotals.carbsG, selectedTotals.fiberG)
  const selectedSport   = sportLog.filter((e) => e.date === selected)
  const selectedFasting = fastingSessions.filter(
    (s) => s.startTime.slice(0, 10) === selected || (s.endTime ?? '').slice(0, 10) === selected,
  )
  const selectedKcalBurned = selectedSport.reduce((s, e) => s + (e.kcalBurned ?? 0), 0)
  const selectedNetKcal = Math.round(selectedTotals.kcal - selectedKcalBurned)

  const selectedDateLabel = new Date(selected + 'T12:00:00').toLocaleDateString(
    lang === 'de' ? 'de-DE' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long' }
  )

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">{tr.calendarTitle}</h2>

      {/* Month nav */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1 hover:bg-cream-100 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-semibold text-sm">{MONTHS[view.month]} {view.year}</h3>
          <button onClick={nextMonth} className="p-1 hover:bg-cream-100 rounded-lg transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs text-cream-400 font-medium py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day     = i + 1
            const dateKey = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const status  = getDayStatus(dateKey)
            const isToday = dateKey === toKey(today)
            const isSel   = dateKey === selected
            return (
              <button
                key={day}
                onClick={() => setSelected(dateKey)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl
                  text-sm transition-all
                  ${isSel ? 'bg-charcoal-900 text-cream-50 font-semibold'
                    : isToday ? 'ring-2 ring-charcoal-900 font-semibold'
                    : 'hover:bg-cream-100'}`}
              >
                {day}
                {status !== 'empty' && !isSel && (
                  <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full
                    ${status === 'keto' ? 'bg-accent-green' : 'bg-yellow-400'}`} />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-4 mt-3 text-xs text-cream-400 justify-center">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-green inline-block" /> {tr.ketoLegend}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> {tr.entriesLegend}
          </span>
        </div>
      </div>

      {/* ── Selected day detail ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-charcoal-900">{selectedDateLabel}</h3>

        {selectedEntries.length === 0 && selectedSport.length === 0 && selectedFasting.length === 0 ? (
          <div className="card-sm text-center text-cream-400 text-sm py-8">{tr.noEntries}</div>
        ) : (
          <>
            {/* Macro summary */}
            {selectedEntries.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold">{tr.macros}</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1
                    ${selectedNetCarbs <= macroTargets.carbsG
                      ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedNetCarbs <= macroTargets.carbsG
                      ? <><Leaf size={11} />{tr.ketoOk}</>
                      : <><AlertTriangle size={11} />{tr.carbsHigh}</>}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: tr.netKcal, value: selectedNetKcal, sub: selectedKcalBurned > 0 ? `-${selectedKcalBurned}` : undefined, subIcon: selectedKcalBurned > 0, warn: false },
                    { label: tr.fat,    value: `${Math.round(selectedTotals.fatG)}g`, sub: undefined, subIcon: false, warn: false },
                    { label: tr.prot,   value: `${Math.round(selectedTotals.proteinG)}g`, sub: undefined, subIcon: false, warn: false },
                    { label: tr.nCarbs, value: `${Math.round(selectedNetCarbs)}g`, sub: `(${tr.max} ${macroTargets.carbsG}g)`, subIcon: false, warn: selectedNetCarbs > macroTargets.carbsG },
                  ].map((m) => (
                    <div key={m.label} className={`rounded-xl p-2 text-center ${m.warn ? 'bg-red-50' : 'bg-cream-50'}`}>
                      <p className="text-xs text-cream-400">{m.label}</p>
                      <p className={`font-mono font-semibold text-sm ${m.warn ? 'text-red-600' : ''}`}>{m.value}</p>
                      {m.sub && <p className={`text-[9px] flex items-center justify-center gap-0.5 ${m.warn ? 'text-red-400' : 'text-green-600'}`}>{m.sub}{m.subIcon && <Dumbbell size={8} />}</p>}
                    </div>
                  ))}
                </div>

                {/* Individual meals with edit/delete */}
                <div className="space-y-2">
                  {selectedEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 group">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{e.name}</p>
                        <p className="text-[10px] text-cream-400 font-mono">
                          {e.kcal} kcal · {netCarbs(e.carbsG, e.fiberG).toFixed(1)}g NC · {e.time}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ type: 'food', entry: e })}
                          className="p-1.5 hover:bg-cream-100 rounded-lg transition-colors"
                          title={tr.edit}
                        >
                          <Pencil size={12} className="text-charcoal-600" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'delete', onConfirm: () => removeFoodEntry(e.id) })}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title={tr.delete}
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sport */}
            {selectedSport.length > 0 && (
              <div className="card">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Dumbbell size={12} /> {tr.sportLabel}</h4>
                <div className="space-y-2">
                  {selectedSport.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 group">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{s.name}</p>
                        <p className="text-[10px] text-cream-400 font-mono">
                          {s.durationMin} min{s.kcalBurned ? ` · ${s.kcalBurned} kcal` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setModal({ type: 'sport', entry: s })}
                          className="p-1.5 hover:bg-cream-100 rounded-lg"
                        >
                          <Pencil size={12} className="text-charcoal-600" />
                        </button>
                        <button
                          onClick={() => setModal({ type: 'delete', onConfirm: () => removeSportEntry(s.id) })}
                          className="p-1.5 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={12} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fasting */}
            {selectedFasting.length > 0 && (
              <div className="card">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Timer size={12} /> {tr.fastingLabel}</h4>
                <div className="space-y-2">
                  {selectedFasting.map((s) => {
                    const h = s.endTime
                      ? ((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3_600_000).toFixed(1)
                      : null
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-2 group">
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{s.protocol}</p>
                          <p className="text-[10px] text-cream-400 font-mono">
                            {h ? `${h}h` : tr.stillRunning}{s.completed ? ' ✓' : ''}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModal({ type: 'fasting', session: s })}
                            className="p-1.5 hover:bg-cream-100 rounded-lg"
                          >
                            <Pencil size={12} className="text-charcoal-600" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'delete', onConfirm: () => removeFastingSession(s.id) })}
                            className="p-1.5 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={12} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === 'food' && (
        <FoodEditModal
          entry={modal.entry}
          onSave={(updates) => updateFoodEntry(modal.entry.id, updates)}
          onClose={() => setModal(null)}
          tr={tr}
        />
      )}
      {modal?.type === 'sport' && (
        <SportEditModal
          entry={modal.entry}
          onSave={(updates) => updateSportEntry(modal.entry.id, updates)}
          onClose={() => setModal(null)}
          tr={tr}
        />
      )}
      {modal?.type === 'fasting' && (
        <FastingEditModal
          session={modal.session}
          onSave={(updates) => updateFastingSession(modal.session.id, updates)}
          onClose={() => setModal(null)}
          tr={tr}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirm
          onConfirm={modal.onConfirm}
          onClose={() => setModal(null)}
          tr={tr}
        />
      )}
    </div>
  )
}
