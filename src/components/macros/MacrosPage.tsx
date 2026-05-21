import { useState } from 'react'
import { useKetoStore } from '@/store'
import { useToday, useFrequentRecipes } from '@/hooks'
import { toDateKey, netCarbs } from '@/utils/calculations'
import { t } from '@/i18n'
import { Plus, Trash2, Barcode, Pencil, Info } from 'lucide-react'
import type { MacroEntry, Recipe } from '@/types'
import BarcodeScanner from './BarcodeScanner'
import { RecipeAddOverlay } from '@/components/recipes/RecipesPage'

const emptyForm = {
  name: '', kcal: '', fatG: '', proteinG: '', carbsG: '', fiberG: '', notes: ''
}

// ─── Color thresholds ─────────────────────────────────────────────────────────
function macroBarColor(current: number, target: number, type: 'cap' | 'hit'): string {
  const pct = current / target
  if (type === 'cap') {
    if (pct >= 1.0) return 'bg-red-400'
    if (pct >= 0.9) return 'bg-yellow-400'
    return 'bg-charcoal-900'
  } else {
    if (pct >= 1.0) return 'bg-red-400'
    if (pct >= 0.85) return 'bg-accent-green'
    if (pct >= 0.6) return 'bg-yellow-400'
    return 'bg-charcoal-900'
  }
}

export default function MacrosPage() {
  const [showForm, setShowForm]       = useState(false)
  const [showBarcode, setShowBarcode] = useState(false)
  const [editId, setEditId]           = useState<string | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [showErythritolHint, setShowErythritolHint] = useState(false)
  const [overlayRecipe, setOverlayRecipe] = useState<Recipe | null>(null)

  const addFoodEntry    = useKetoStore((s) => s.addFoodEntry)
  const updateFoodEntry = useKetoStore((s) => s.updateFoodEntry)
  const removeFoodEntry = useKetoStore((s) => s.removeFoodEntry)
  const logRecipeUse    = useKetoStore((s) => s.logRecipeUse)
  const targets         = useKetoStore((s) => s.macroTargets)
  const lang            = useKetoStore((s) => s.lang)
  const { todayFood, totals } = useToday()
  const frequent        = useFrequentRecipes(5)

  const tr = t[lang]
  const n = (v: string) => parseFloat(v) || 0

  const netCarbsToday = netCarbs(totals.carbsG, totals.fiberG)

  function openEdit(entry: MacroEntry) {
    setEditId(entry.id)
    setForm({
      name:     entry.name,
      kcal:     String(entry.kcal),
      fatG:     String(entry.fatG),
      proteinG: String(entry.proteinG),
      carbsG:   String(entry.carbsG),
      fiberG:   String(entry.fiberG ?? 0),
      notes:    entry.notes ?? '',
    })
    setShowForm(true)
    setShowBarcode(false)
  }

  function handleSubmit() {
    if (!form.name) return
    const data = {
      name:     form.name,
      kcal:     n(form.kcal),
      fatG:     n(form.fatG),
      proteinG: n(form.proteinG),
      carbsG:   n(form.carbsG),
      fiberG:   n(form.fiberG),
      notes:    form.notes || undefined,
    }
    if (editId) {
      updateFoodEntry(editId, data)
      setEditId(null)
    } else {
      addFoodEntry({
        date: toDateKey(),
        time: new Date().toTimeString().slice(0, 5),
        ...data,
      })
    }
    setForm(emptyForm)
    setShowForm(false)
  }

  function handleBarcodeAdd(entry: {
    name: string; kcal: number; fatG: number
    proteinG: number; carbsG: number; fiberG: number; notes?: string
  }) {
    addFoodEntry({ date: toDateKey(), time: new Date().toTimeString().slice(0, 5), ...entry })
    setShowBarcode(false)
  }

  function handleCancel() {
    setShowForm(false)
    setEditId(null)
    setForm(emptyForm)
  }

  const macroRows = [
    { label: tr.labelKcal,    current: totals.kcal,      target: targets.kcal,     unit: 'kcal', type: 'cap' as const },
    { label: tr.labelFatG,    current: totals.fatG,      target: targets.fatG,     unit: 'g',    type: 'hit' as const },
    { label: tr.labelProteinG,current: totals.proteinG,  target: targets.proteinG, unit: 'g',    type: 'hit' as const },
    { label: tr.netCarbsLabel,current: netCarbsToday,    target: targets.carbsG,   unit: 'g',    type: 'cap' as const },
    { label: tr.labelFiberG,  current: totals.fiberG,    target: targets.fiberG,   unit: 'g',    type: 'hit' as const },
  ]

  const formFieldLabels: Record<string, string> = {
    kcal:     tr.formLabelKcal,
    fatG:     tr.formLabelFat,
    proteinG: tr.formLabelProtein,
    carbsG:   tr.formLabelCarbs,
    fiberG:   tr.formLabelFiber,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{tr.macrosTitle}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowBarcode(!showBarcode); handleCancel() }}
            className="btn-secondary flex items-center gap-1.5"
          >
            <Barcode size={16} />
            Scan
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowBarcode(false); setEditId(null); setForm(emptyForm) }}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus size={16} />
            {tr.addEntry}
          </button>
        </div>
      </div>

      {/* Today's totals summary bars */}
      <div className="card space-y-3">
        {macroRows.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{m.label}</span>
              <span className="font-mono text-cream-400">
                {Math.round(m.current * 10) / 10}/{m.target}{m.unit}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-bar-fill ${macroBarColor(m.current, m.target, m.type)}`}
                style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-[10px] text-cream-400 pt-1">
          {tr.netCarbsFormula}
        </p>
      </div>

      {/* Erythritol hint */}
      <div className="card-sm">
        <button
          className="flex items-center gap-2 text-xs text-cream-400 w-full text-left"
          onClick={() => setShowErythritolHint(!showErythritolHint)}
        >
          <Info size={13} className="shrink-0" />
          <span>{tr.erythritolHint}</span>
          <span className="ml-auto">{showErythritolHint ? '▲' : '▼'}</span>
        </button>
        {showErythritolHint && (
          <div className="mt-2 text-xs text-charcoal-800 space-y-1 border-t border-cream-200 pt-2">
            <p>{tr.erythritolLine1} <strong>{tr.erythritolNotWord}</strong> {tr.erythritolLine1End}</p>
            <p>{tr.erythritolLine2} <strong>{tr.erythritolLine2Bold}</strong> {tr.erythritolLine2End}</p>
            <p>{tr.erythritolLine3}</p>
          </div>
        )}
      </div>

      {/* Barcode scanner */}
      {showBarcode && (
        <BarcodeScanner
          onAdd={handleBarcodeAdd}
          onClose={() => setShowBarcode(false)}
        />
      )}

      {/* Quick-add from frequent recipes */}
      {frequent.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">{tr.frequentRecipes}</h3>
          <div className="flex flex-col gap-2">
            {frequent.map((r) => (
              <button
                key={r.id}
                onClick={() => setOverlayRecipe(r)}
                className="flex items-center justify-between text-sm px-3 py-2 rounded-xl
                  bg-cream-50 border border-cream-200 hover:bg-cream-100 transition-colors text-left"
              >
                <div>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-cream-400 text-xs ml-2">
                    {r.kcalPerServing} kcal · {netCarbs(r.carbsGPerServing, r.fiberGPerServing)}g {tr.nCarbs}
                  </span>
                </div>
                <span className="text-cream-300 text-xs">{r.usageCount}×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="card space-y-3 fade-up">
          <h3 className="text-sm font-semibold">{editId ? tr.editEntry2 : tr.newMeal}</h3>
          <div>
            <label className="label">{tr.name}</label>
            <input className="input" placeholder={tr.mealNamePlaceholder}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['kcal', 'fatG', 'proteinG', 'carbsG', 'fiberG'] as const).map((key) => (
              <div key={key}>
                <label className="label">{formFieldLabels[key]}</label>
                <input className="input" type="number"
                  value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          {/* Live Net-Carbs preview */}
          <p className="text-xs text-cream-400">
            {tr.netCarbsPreview} <span className="font-mono font-semibold text-charcoal-900">
              {Math.max(0, n(form.carbsG) - n(form.fiberG)).toFixed(1)}g
            </span>
          </p>
          <div>
            <label className="label">{tr.noteOptional}</label>
            <input className="input" placeholder={tr.notePlaceholder}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSubmit} className="btn-primary flex-1">
              {editId ? tr.save : tr.addBtn}
            </button>
            <button onClick={handleCancel} className="btn-secondary">{tr.cancel}</button>
          </div>
        </div>
      )}

      {/* Food log */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-charcoal-900">{tr.todayLabel}</h3>
        {todayFood.length === 0 && (
          <div className="card-sm text-center text-cream-400 text-sm py-8">
            {tr.noEntriesYet}
          </div>
        )}
        {todayFood.map((entry: MacroEntry) => {
          const nc = netCarbs(entry.carbsG, entry.fiberG)
          return (
            <div key={entry.id} className="card-sm flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{entry.name}</p>
                <p className="text-xs text-cream-400 font-mono mt-0.5">
                  {Math.round(entry.kcal)} kcal · F {entry.fatG}g · P {entry.proteinG}g · C {nc}g {tr.nettoLabel}
                </p>
                {entry.notes && <p className="text-xs text-cream-400 italic mt-0.5">{entry.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-cream-300">{entry.time}</span>
                <button onClick={() => openEdit(entry)}
                  className="text-cream-300 hover:text-charcoal-700 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => removeFoodEntry(entry.id)}
                  className="text-cream-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}

      {overlayRecipe && (
        <RecipeAddOverlay
          recipe={overlayRecipe}
          onConfirm={(macros) => {
            addFoodEntry({
              date: toDateKey(),
              time: new Date().toTimeString().slice(0, 5),
              name: overlayRecipe.name,
              kcal: macros.kcal,
              fatG: macros.fatG,
              proteinG: macros.proteinG,
              carbsG: macros.carbsG,
              fiberG: macros.fiberG,
              recipeId: overlayRecipe.id,
            })
            setOverlayRecipe(null)
          }}
          onClose={() => setOverlayRecipe(null)}
        />
      )}
      </div>
    </div>
  )
}
