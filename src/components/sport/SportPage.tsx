import React, { useState } from 'react'
import { useKetoStore } from '@/store'
import { t } from '@/i18n'
import { toDateKey } from '@/utils/calculations'
import { Plus, Trash2, Zap, Bike, MoveRight, Waves, Activity, MoreHorizontal, Shield } from 'lucide-react'
import type { SportCategory } from '@/types'

const SPORT_ICONS: Record<string, React.ReactNode> = {
  strength: <Shield size={16} />,
  cardio:   <Activity size={16} />,
  hiit:     <Zap size={16} />,
  cycling:  <Bike size={16} />,
  walking:  <MoveRight size={16} />,
  yoga:     <Waves size={16} />,
  swimming: <Waves size={16} />,
  other:    <MoreHorizontal size={16} />,
}

const emptyForm = {
  name: '', category: 'strength' as SportCategory,
  durationMin: '', kcalBurned: '', notes: ''
}

export default function SportPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(emptyForm)
  const addSportEntry           = useKetoStore((s) => s.addSportEntry)
  const removeSportEntry        = useKetoStore((s) => s.removeSportEntry)
  const sportLog                = useKetoStore((s) => s.sportLog)
  const lang                    = useKetoStore((s) => s.lang)
  const tr                      = t[lang]

  const CATEGORIES = [
    { id: 'strength' as SportCategory, label: tr.catStrength },
    { id: 'cardio'   as SportCategory, label: tr.catCardio },
    { id: 'hiit'     as SportCategory, label: tr.catHiit },
    { id: 'cycling'  as SportCategory, label: tr.catCycling },
    { id: 'walking'  as SportCategory, label: tr.catWalking },
    { id: 'yoga'     as SportCategory, label: tr.catYoga },
    { id: 'swimming' as SportCategory, label: tr.catSwimming },
    { id: 'other'    as SportCategory, label: tr.catOther },
  ]

  const today      = toDateKey()
  const todaySport = sportLog.filter((e) => e.date === today)
  const totalMin   = todaySport.reduce((s, e) => s + e.durationMin, 0)
  const totalKcal  = todaySport.reduce((s, e) => s + (e.kcalBurned ?? 0), 0)

  function handleSubmit() {
    if (!form.name) return
    addSportEntry({
      date: today,
      time: new Date().toTimeString().slice(0, 5),
      name: form.name,
      category: form.category,
      durationMin: parseInt(form.durationMin) || 0,
      kcalBurned:  parseFloat(form.kcalBurned) || undefined,
      notes: form.notes || undefined,
    })
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{tr.sportTitle}</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} />
          {tr.addSession}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-sm text-center">
          <div className="font-mono text-2xl font-semibold">{totalMin}</div>
          <div className="text-xs text-cream-400 uppercase tracking-wide">{tr.minutesToday}</div>
        </div>
        <div className="card-sm text-center">
          <div className="font-mono text-2xl font-semibold">{totalKcal}</div>
          <div className="text-xs text-cream-400 uppercase tracking-wide">{tr.kcalBurnedToday}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card space-y-3 fade-up">
          <h3 className="text-sm font-semibold">{tr.newSession}</h3>
          <div>
            <label className="label">{tr.designation}</label>
            <input className="input" placeholder={tr.designationPlaceholder}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.category}</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button"
                  onClick={() => setForm({ ...form, category: c.id })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all
                    ${form.category === c.id
                      ? 'bg-charcoal-900 text-cream-50 border-charcoal-900'
                      : 'border-cream-300 hover:bg-cream-100'}`}
                >
                  <span className="inline-flex items-center gap-1.5">{SPORT_ICONS[c.id]}{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{tr.durationMinLabel}</label>
              <input className="input" type="number"
                value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
            </div>
            <div>
              <label className="label">{tr.kcalOptional}</label>
              <input className="input" type="number"
                value={form.kcalBurned} onChange={(e) => setForm({ ...form, kcalBurned: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} className="btn-primary flex-1">{tr.save}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">{tr.cancel}</button>
          </div>
        </div>
      )}

      {/* Log */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{tr.todayLabel}</h3>
        {todaySport.length === 0 && (
          <div className="card-sm text-center text-cream-400 text-sm py-8">
            {tr.noSportToday}
          </div>
        )}
        {todaySport.map((e) => {
          const cat = CATEGORIES.find((c) => c.id === e.category)
          return (
            <div key={e.id} className="card-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center text-charcoal-800 shrink-0">{SPORT_ICONS[e.category] ?? <MoreHorizontal size={16} />}</span>
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-cream-400">
                    {e.durationMin} min{e.kcalBurned ? ` · ${e.kcalBurned} kcal` : ''}
                    {cat ? ` · ${cat.label}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => removeSportEntry(e.id)}
                className="text-cream-300 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
