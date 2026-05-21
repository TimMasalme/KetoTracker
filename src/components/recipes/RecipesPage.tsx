import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useKetoStore } from '@/store'
import { t } from '@/i18n'
import {
  Plus, Trash2, Star, BookOpen, X, ChefHat, Check,
  Loader2, Barcode, AlertCircle, Pencil,
} from 'lucide-react'
import type { Recipe, Ingredient } from '@/types'

// Categories are now translated dynamically via tr keys
const CATEGORY_IDS: Recipe['category'][] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink']

const emptyForm = {
  name: '', category: 'breakfast' as Recipe['category'],
  servings: '1', instructions: '', tags: '', isFavorite: false,
}

// ─── Barcode lookup (same as BarcodeScanner.tsx) ─────────────────────────────
interface ProductInfo {
  name: string
  kcalPer100g: number
  fatPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fiberPer100g: number
}

async function lookupBarcode(barcode: string, unknownLabel: string): Promise<ProductInfo | null> {
  try {
    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}')
    if (customFoods[barcode]) return customFoods[barcode]
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,nutriments,serving_size`
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const n = p.nutriments ?? {}
    return {
      name:          p.product_name ?? unknownLabel,
      kcalPer100g:   n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
      fatPer100g:    n['fat_100g'] ?? 0,
      proteinPer100g:n['proteins_100g'] ?? 0,
      carbsPer100g:  n['carbohydrates_100g'] ?? 0,
      fiberPer100g:  n['fiber_100g'] ?? 0,
    }
  } catch { return null }
}

// ─── Macro math ───────────────────────────────────────────────────────────────
function calcIngredientMacros(ing: Ingredient) {
  const factor = ing.amount / 100
  return {
    kcal:     Math.round(ing.kcalPer100    * factor),
    fatG:     Math.round(ing.fatPer100     * factor * 10) / 10,
    proteinG: Math.round(ing.proteinPer100 * factor * 10) / 10,
    carbsG:   Math.round(ing.carbsPer100   * factor * 10) / 10,
    fiberG:   Math.round(ing.fiberPer100   * factor * 10) / 10,
  }
}

function sumIngredients(ings: Ingredient[], servings = 1) {
  const total = ings.reduce(
    (acc, ing) => { const m = calcIngredientMacros(ing); return {
      kcal:     acc.kcal     + m.kcal,
      fatG:     acc.fatG     + m.fatG,
      proteinG: acc.proteinG + m.proteinG,
      carbsG:   acc.carbsG   + m.carbsG,
      fiberG:   acc.fiberG   + m.fiberG,
    }},
    { kcal: 0, fatG: 0, proteinG: 0, carbsG: 0, fiberG: 0 }
  )
  return {
    kcal:     Math.round(total.kcal     / servings),
    fatG:     Math.round(total.fatG     / servings * 10) / 10,
    proteinG: Math.round(total.proteinG / servings * 10) / 10,
    carbsG:   Math.round(total.carbsG   / servings * 10) / 10,
    fiberG:   Math.round(total.fiberG   / servings * 10) / 10,
  }
}

// ─── Barcode-based ingredient scanner ────────────────────────────────────────
function IngredientScanner({ onAdd }: { onAdd: (ing: Ingredient) => void }) {
  const lang = useKetoStore((s) => s.lang)
  const tr = t[lang]

  const [mode, setMode]         = useState<'camera' | 'manual-barcode' | 'manual-macros'>('camera')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [product, setProduct]   = useState<ProductInfo | null>(null)
  const [amount, setAmount]     = useState('100')
  const [unit, setUnit]         = useState<'g' | 'ml'>('g')
  const [manualName, setManualName] = useState('')
  const [manualMacros, setManualMacros] = useState({ kcal: '', fat: '', protein: '', carbs: '', fiber: '' })

  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (mode !== 'camera') { stopCamera(); return }
    let active = true
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        streamRef.current = stream
        if (videoRef.current && active) videoRef.current.srcObject = stream
        // @ts-ignore
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })
          intervalRef.current = setInterval(async () => {
            if (!videoRef.current || !active) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue
                stopCamera()
                setMode('manual-barcode')
                setBarcodeInput(code)
                await doLookup(code)
              }
            } catch { /* frame errors */ }
          }, 500)
        } else {
          setError(tr.scannerCameraUnavailable)
          setMode('manual-barcode')
        }
      } catch {
        setError(tr.scannerCameraDenied)
        setMode('manual-barcode')
      }
    }
    startCamera()
    return () => { active = false; stopCamera() }
  }, [mode])

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function doLookup(code: string) {
    if (!code.trim()) return
    setLoading(true); setError(''); setProduct(null)
    const result = await lookupBarcode(code.trim(), tr.scannerUnknownProduct)
    setLoading(false)
    if (!result) {
      setError(tr.scannerNotFound)
    } else {
      setProduct(result)
      setManualName(result.name)
      setManualMacros({
        kcal:    String(result.kcalPer100g),
        fat:     String(result.fatPer100g),
        protein: String(result.proteinPer100g),
        carbs:   String(result.carbsPer100g),
        fiber:   String(result.fiberPer100g),
      })
    }
  }

  function handleAdd() {
    const n = (v: string) => parseFloat(v) || 0
    const ing: Ingredient = {
      name:          manualName || product?.name || tr.scannerDefaultIngredient,
      amount:        n(amount),
      unit,
      kcalPer100:    n(manualMacros.kcal),
      fatPer100:     n(manualMacros.fat),
      proteinPer100: n(manualMacros.protein),
      carbsPer100:   n(manualMacros.carbs),
      fiberPer100:   n(manualMacros.fiber),
    }
    onAdd(ing)
    setProduct(null); setBarcodeInput(''); setAmount('100'); setUnit('g'); setError('')
    setManualName(''); setManualMacros({ kcal: '', fat: '', protein: '', carbs: '', fiber: '' })
    setMode('camera')
  }

  const previewMacros = product || (manualMacros.kcal ? {
    kcalPer100g:    parseFloat(manualMacros.kcal)    || 0,
    fatPer100g:     parseFloat(manualMacros.fat)     || 0,
    proteinPer100g: parseFloat(manualMacros.protein) || 0,
    carbsPer100g:   parseFloat(manualMacros.carbs)   || 0,
    fiberPer100g:   parseFloat(manualMacros.fiber)   || 0,
  } : null)

  const amountNum = parseFloat(amount) || 100
  const preview = previewMacros ? {
    kcal:     Math.round(previewMacros.kcalPer100g    * amountNum / 100),
    fatG:     Math.round(previewMacros.fatPer100g     * amountNum / 100 * 10) / 10,
    proteinG: Math.round(previewMacros.proteinPer100g * amountNum / 100 * 10) / 10,
    carbsG:   Math.round(previewMacros.carbsPer100g   * amountNum / 100 * 10) / 10,
  } : null

  const canAdd = mode === 'manual-macros'
    ? manualName && manualMacros.kcal
    : !!product

  const tabs = [
    { id: 'camera'        as const, label: tr.scannerTabCamera  },
    { id: 'manual-barcode'as const, label: tr.scannerTabBarcode },
    { id: 'manual-macros' as const, label: tr.scannerTabManual  },
  ]

  return (
    <div className="border border-cream-200 rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-cream-100">
        {tabs.map((tab) => (
          <button key={tab.id}
            onClick={() => { setMode(tab.id); setProduct(null); setError('') }}
            className={`flex-1 py-2 text-xs font-medium transition-colors
              ${mode === tab.id
                ? 'bg-charcoal-900 text-cream-50'
                : 'text-cream-500 hover:bg-cream-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">

        {/* ── CAMERA ─────────────────────────────────────────────────── */}
        {mode === 'camera' && !product && (
          <div className="relative rounded-xl overflow-hidden bg-charcoal-900 aspect-video">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={28} className="text-white animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/60 rounded-lg w-2/3 h-16 flex items-center justify-center">
                <span className="text-white/70 text-xs">{tr.scannerAlignHint}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── MANUAL BARCODE INPUT ────────────────────────────────────── */}
        {mode === 'manual-barcode' && !product && (
          <div className="flex gap-2">
            <input className="input flex-1" type="number"
              placeholder={tr.scannerBarcodePlaceholder}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doLookup(barcodeInput)}
            />
            <button onClick={() => doLookup(barcodeInput)} disabled={loading}
              className="btn-primary px-3 flex items-center gap-1">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Barcode size={15} />}
            </button>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-3">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
              {mode !== 'manual-macros' && (
                <button onClick={() => { setError(''); setMode('manual-macros') }}
                  className="underline font-medium mt-1">
                  {tr.scannerEnterMacrosManually}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── PRODUCT FOUND / MACRO EDITOR ────────────────────────────── */}
        {(product || mode === 'manual-macros') && (
          <div className="space-y-3">

            {/* Product name */}
            <div>
              <label className="label">{tr.scannerProductName}</label>
              <input className="input text-sm" value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder={tr.scannerProductNamePlaceholder} />
            </div>

            {/* Macros per 100g */}
            <div>
              <p className="label flex items-center justify-between">
                {tr.scannerMacrosPer100(unit)}
                {product && <span className="text-[10px] text-accent-green font-medium normal-case">{tr.scannerViaBarcode}</span>}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ['kcal', 'kcal'], ['fat', tr.macroLabelFat], ['protein', tr.proteinLabel],
                  ['carbs', tr.nCarbs], ['fiber', tr.macroLabelFiber],
                ].map(([k, lbl]) => (
                  <div key={k}>
                    <label className="label text-[10px]">{lbl}</label>
                    <input className="input text-sm" type="number" step="0.1"
                      value={manualMacros[k as keyof typeof manualMacros]}
                      onChange={(e) => setManualMacros({ ...manualMacros, [k]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Amount & unit */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="label">{tr.scannerAmount}</label>
                <input className="input text-sm" type="number" min="1"
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="w-24">
                <label className="label">{tr.scannerUnit}</label>
                <select className="input text-sm" value={unit}
                  onChange={(e) => setUnit(e.target.value as 'g' | 'ml')}>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>

            {/* Live preview */}
            {preview && (
              <div className="grid grid-cols-4 gap-1 text-center">
                {[
                  { l: 'kcal',           v: preview.kcal },
                  { l: tr.overlayMacroFat,   v: `${preview.fatG}g` },
                  { l: tr.prot,          v: `${preview.proteinG}g` },
                  { l: tr.nCarbs,        v: `${preview.carbsG}g` },
                ].map(({ l, v }) => (
                  <div key={l} className="bg-cream-50 rounded-lg py-1.5">
                    <p className="text-[9px] text-cream-400">{l}</p>
                    <p className="text-xs font-semibold font-mono">{v}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={!canAdd}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5 disabled:opacity-40">
                <Plus size={14} /> {tr.scannerAddIngredient}
              </button>
              <button onClick={() => { setProduct(null); setError(''); setMode('camera') }}
                className="btn-secondary px-3">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {!product && mode === 'camera' && !loading && !error && (
          <p className="text-[11px] text-cream-400 text-center">
            {tr.scannerNoBarcode}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Ingredient row (editable amount) ────────────────────────────────────────
function IngredientRow({
  ing, onAmountChange, onRemove,
}: {
  ing: Ingredient
  onAmountChange: (amount: number) => void
  onRemove?: () => void
}) {
  const m = calcIngredientMacros(ing)
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-cream-100 last:border-0">
      <input
        className="w-16 text-center rounded-lg border border-cream-200 bg-cream-50 text-sm py-1 px-1 font-mono
          focus:outline-none focus:ring-1 focus:ring-charcoal-900"
        type="number" min="0" step="1"
        value={ing.amount}
        onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
      />
      <span className="text-xs text-cream-400 w-6">{ing.unit}</span>
      <span className="flex-1 text-sm truncate">{ing.name}</span>
      <span className="text-[10px] text-cream-400 font-mono shrink-0">{m.kcal} kcal</span>
      {onRemove && (
        <button onClick={onRemove} className="text-cream-300 hover:text-red-400 transition-colors ml-1 shrink-0">
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ─── Recipe add overlay ───────────────────────────────────────────────────────
export function RecipeAddOverlay({
  recipe, onConfirm, onClose,
}: {
  recipe: Recipe
  onConfirm: (macros: { kcal: number; fatG: number; proteinG: number; carbsG: number; fiberG: number }) => void
  onClose: () => void
}) {
  const lang = useKetoStore((s) => s.lang)
  const tr = t[lang]

  const structuredIngs = (recipe.ingredients as (Ingredient | string)[]).filter(
    (i): i is Ingredient => typeof i === 'object'
  )
  const isLegacy = structuredIngs.length === 0

  const [rawAmounts, setRawAmounts] = useState<string[]>(
    structuredIngs.map((ing) => String(ing.amount))
  )
  const [servings, setServings] = useState(1)

  const numericAmounts = rawAmounts.map((v) => parseFloat(v) || 0)

  const macros = isLegacy
    ? {
        kcal:     Math.round(recipe.kcalPerServing     * servings),
        fatG:     Math.round(recipe.fatGPerServing     * servings * 10) / 10,
        proteinG: Math.round(recipe.proteinGPerServing * servings * 10) / 10,
        carbsG:   Math.round(recipe.carbsGPerServing   * servings * 10) / 10,
        fiberG:   Math.round(recipe.fiberGPerServing   * servings * 10) / 10,
      }
    : (() => {
        const total = structuredIngs.reduce(
          (acc, ing, i) => {
            const factor = numericAmounts[i] / 100
            return {
              kcal:     acc.kcal     + ing.kcalPer100    * factor,
              fatG:     acc.fatG     + ing.fatPer100     * factor,
              proteinG: acc.proteinG + ing.proteinPer100 * factor,
              carbsG:   acc.carbsG   + ing.carbsPer100   * factor,
              fiberG:   acc.fiberG   + ing.fiberPer100   * factor,
            }
          },
          { kcal: 0, fatG: 0, proteinG: 0, carbsG: 0, fiberG: 0 }
        )
        return {
          kcal:     Math.round(total.kcal),
          fatG:     Math.round(total.fatG     * 10) / 10,
          proteinG: Math.round(total.proteinG * 10) / 10,
          carbsG:   Math.round(total.carbsG   * 10) / 10,
          fiberG:   Math.round(total.fiberG   * 10) / 10,
        }
      })()

  function updateRawAmount(index: number, val: string) {
    if (val !== '' && (isNaN(parseFloat(val)) || parseFloat(val) < 0)) return
    setRawAmounts((prev) => prev.map((v, i) => i === index ? val : v))
  }

  const macroItems = [
    { label: 'kcal',              value: macros.kcal,     unit: '' },
    { label: tr.overlayMacroFat,  value: macros.fatG,     unit: 'g' },
    { label: tr.proteinLabel,     value: macros.proteinG, unit: 'g' },
    { label: tr.nCarbs,           value: macros.carbsG,   unit: 'g' },
    { label: tr.overlayMacroFiber,value: macros.fiberG,   unit: 'g' },
  ]

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        left: 'var(--sidebar-w, 0px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.50)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '88dvh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          borderRadius: '20px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 shrink-0">
          <div>
            <h2 className="font-semibold text-base text-charcoal-900 leading-tight">{recipe.name}</h2>
            <p className="text-xs text-cream-400 mt-0.5">
              {isLegacy ? tr.overlayAdjustServings : tr.overlayAdjustAmounts}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cream-100 flex items-center justify-center text-cream-500 hover:bg-cream-200 hover:text-charcoal-900 transition-colors shrink-0 ml-3"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 space-y-1">

          {isLegacy ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-charcoal-800 font-medium">{tr.overlayServings}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                    className="w-8 h-8 rounded-full border border-cream-300 flex items-center justify-center text-charcoal-900 hover:bg-cream-100 transition-colors font-semibold"
                  >−</button>
                  <span className="w-10 text-center font-mono text-sm font-semibold">{servings}</span>
                  <button
                    onClick={() => setServings(servings + 0.5)}
                    className="w-8 h-8 rounded-full border border-cream-300 flex items-center justify-center text-charcoal-900 hover:bg-cream-100 transition-colors font-semibold"
                  >+</button>
                </div>
              </div>
              <div className="rounded-xl border border-cream-200 overflow-hidden">
                {(recipe.ingredients as string[]).map((ing, i) => (
                  <div key={i} className="px-3 py-2.5 text-sm border-b border-cream-100 last:border-0 text-charcoal-800">
                    {ing}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-cream-400">{tr.overlayScaledHint}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-cream-200 overflow-hidden">
              {/* Column header */}
              <div className="grid grid-cols-[80px_40px_1fr_56px] gap-2 px-3 py-2 bg-cream-50 border-b border-cream-200">
                <span className="text-[10px] font-medium text-cream-500 uppercase tracking-wide">{tr.overlayColAmount}</span>
                <span className="text-[10px] font-medium text-cream-500 uppercase tracking-wide">{tr.overlayColUnit}</span>
                <span className="text-[10px] font-medium text-cream-500 uppercase tracking-wide">{tr.overlayColIngredient}</span>
                <span className="text-[10px] font-medium text-cream-500 uppercase tracking-wide text-right">kcal</span>
              </div>
              {structuredIngs.map((ing, i) => {
                const kcal = Math.round(ing.kcalPer100 * numericAmounts[i] / 100)
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[80px_40px_1fr_56px] gap-2 items-center px-3 py-2.5 border-b border-cream-100 last:border-0"
                  >
                    <input
                      type="number" min="0" step="1"
                      value={rawAmounts[i]}
                      onChange={(e) => updateRawAmount(i, e.target.value)}
                      className="w-full text-center rounded-lg border border-cream-300 bg-white text-sm py-1.5 px-2 font-mono font-semibold
                        focus:outline-none focus:ring-2 focus:ring-charcoal-900 focus:border-transparent transition-all"
                    />
                    <span className="text-xs text-cream-500 font-medium">{ing.unit}</span>
                    <span className="text-sm text-charcoal-900 truncate leading-tight">{ing.name}</span>
                    <span className="text-xs font-mono text-cream-500 text-right">{kcal}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Macro bar + CTA ───────────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-6 shrink-0 space-y-3">
          <div className="h-px bg-cream-200" />
          <div className="grid grid-cols-5 gap-1.5">
            {macroItems.map(({ label, value, unit }) => (
              <div key={label} className="bg-cream-50 border border-cream-200 rounded-xl py-2.5 text-center">
                <p className="text-[10px] text-cream-400 font-medium mb-0.5">{label}</p>
                <p className="text-sm font-semibold font-mono text-charcoal-900">
                  {value}{unit}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => onConfirm(macros)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            <Check size={17} /> {tr.overlayAddToLog}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main RecipesPage ─────────────────────────────────────────────────────────
export default function RecipesPage() {
  const lang         = useKetoStore((s) => s.lang)
  const tr           = t[lang]

  const [showForm,       setShowForm]       = useState(false)
  const [filterCat,      setFilterCat]      = useState<Recipe['category'] | 'all'>('all')
  const [form,           setForm]           = useState(emptyForm)
  const [ingredients,    setIngredients]    = useState<Ingredient[]>([])
  const [showScanner,    setShowScanner]    = useState(false)
  const [previewRecipe,  setPreviewRecipe]  = useState<Recipe | null>(null)

  const addRecipe    = useKetoStore((s) => s.addRecipe)
  const updateRecipe = useKetoStore((s) => s.updateRecipe)
  const removeRecipe = useKetoStore((s) => s.removeRecipe)
  const addFoodEntry = useKetoStore((s) => s.addFoodEntry)
  const recipes      = useKetoStore((s) => s.recipes)

  const servingsNum = parseInt(form.servings) || 1
  const autoMacros  = ingredients.length > 0 ? sumIngredients(ingredients, servingsNum) : null

  // Build categories with translated labels
  const CATEGORIES = [
    { id: 'breakfast' as Recipe['category'], label: tr.catBreakfast },
    { id: 'lunch'     as Recipe['category'], label: tr.catLunch     },
    { id: 'dinner'    as Recipe['category'], label: tr.catDinner    },
    { id: 'snack'     as Recipe['category'], label: tr.catSnack     },
    { id: 'drink'     as Recipe['category'], label: tr.catDrink     },
  ]

  function handleSubmit() {
    if (!form.name) return
    const macros = autoMacros ?? { kcal: 0, fatG: 0, proteinG: 0, carbsG: 0, fiberG: 0 }
    addRecipe({
      name:               form.name,
      category:           form.category,
      servings:           servingsNum,
      kcalPerServing:     macros.kcal,
      fatGPerServing:     macros.fatG,
      proteinGPerServing: macros.proteinG,
      carbsGPerServing:   macros.carbsG,
      fiberGPerServing:   macros.fiberG,
      ingredients,
      instructions:       form.instructions || undefined,
      tags:               form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      isFavorite:         form.isFavorite,
      lastUsed:           undefined,
    })
    setForm(emptyForm); setIngredients([]); setShowForm(false); setShowScanner(false)
  }

  function handleOverlayConfirm(macros: { kcal: number; fatG: number; proteinG: number; carbsG: number; fiberG: number }) {
    if (!previewRecipe) return
    addFoodEntry({
      date:     new Date().toISOString().slice(0, 10),
      time:     new Date().toTimeString().slice(0, 5),
      name:     previewRecipe.name,
      recipeId: previewRecipe.id,
      ...macros,
    })
    updateRecipe(previewRecipe.id, {
      usageCount: previewRecipe.usageCount + 1,
      lastUsed:   new Date().toISOString().slice(0, 10),
    })
    setPreviewRecipe(null)
  }

  const filtered = recipes.filter((r) => filterCat === 'all' || r.category === filterCat)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">{tr.recipesTitle}</h2>
        <button onClick={() => { setShowForm(!showForm); setShowScanner(false) }}
          className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> {tr.recipesAddBtn}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all
            ${filterCat === 'all' ? 'bg-charcoal-900 text-cream-50 border-charcoal-900' : 'border-cream-300 hover:bg-cream-100'}`}>
          {tr.recipesAll}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setFilterCat(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all
              ${filterCat === c.id ? 'bg-charcoal-900 text-cream-50 border-charcoal-900' : 'border-cream-300 hover:bg-cream-100'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Add form ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="card space-y-4 fade-up">
          <h3 className="text-sm font-semibold flex items-center gap-2"><ChefHat size={15} /> {tr.recipesNewRecipe}</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">{tr.recipesNameLabel}</label>
              <input className="input" placeholder={tr.recipesNamePlaceholder}
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">{tr.recipesCategoryLabel}</label>
              <select className="input" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Recipe['category'] })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{tr.recipesServingsLabel}</label>
              <input className="input" type="number" min="1"
                value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value })} />
            </div>
          </div>

          {/* Ingredient section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{tr.recipesIngredientsLabel}</label>
              <button onClick={() => setShowScanner(!showScanner)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all
                  ${showScanner ? 'bg-charcoal-900 text-cream-50 border-charcoal-900' : 'border-cream-300 hover:bg-cream-100'}`}>
                <Barcode size={12} /> {showScanner ? tr.recipesScannerClose : tr.recipesScannerOpen}
              </button>
            </div>

            {showScanner && (
              <div className="mb-3">
                <IngredientScanner onAdd={(ing) => { setIngredients((prev) => [...prev, ing]); setShowScanner(false) }} />
              </div>
            )}

            {ingredients.length > 0 && (
              <div className="border border-cream-200 rounded-xl px-3 py-1">
                {ingredients.map((ing, i) => (
                  <IngredientRow key={i} ing={ing}
                    onAmountChange={(amount) => {
                      const updated = [...ingredients]; updated[i] = { ...updated[i], amount }; setIngredients(updated)
                    }}
                    onRemove={() => setIngredients(ingredients.filter((_, j) => j !== i))}
                  />
                ))}
                <button onClick={() => setShowScanner(true)}
                  className="w-full text-xs text-cream-400 hover:text-charcoal-900 flex items-center justify-center gap-1 py-2 transition-colors">
                  <Plus size={11} /> {tr.recipesAddMoreIngredient}
                </button>
              </div>
            )}

            {ingredients.length === 0 && !showScanner && (
              <button onClick={() => setShowScanner(true)}
                className="w-full border-2 border-dashed border-cream-200 rounded-xl py-4 text-xs text-cream-400
                  hover:border-cream-300 hover:text-charcoal-700 transition-colors flex items-center justify-center gap-2">
                <Barcode size={14} /> {tr.recipesFirstIngredient}
              </button>
            )}
          </div>

          {/* Live macro preview */}
          {autoMacros && (
            <div className="bg-cream-50 rounded-xl p-3">
              <p className="text-[10px] text-cream-400 font-medium uppercase tracking-wide mb-2">
                {tr.recipesPerServing} {servingsNum > 1 ? `(÷${servingsNum})` : ''}
              </p>
              <div className="grid grid-cols-5 gap-1 text-center">
                {[
                  { label: 'kcal',              value: autoMacros.kcal },
                  { label: tr.overlayMacroFat,  value: `${autoMacros.fatG}g` },
                  { label: tr.prot,             value: `${autoMacros.proteinG}g` },
                  { label: tr.nCarbs,           value: `${autoMacros.carbsG}g` },
                  { label: tr.overlayMacroFiber,value: `${autoMacros.fiberG}g` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[9px] text-cream-400">{label}</p>
                    <p className="text-xs font-semibold font-mono">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">{tr.recipesInstructionsLabel}</label>
            <textarea className="input min-h-[60px] resize-none"
              value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.recipesTagsLabel}</label>
            <input className="input" placeholder={tr.recipesTagsPlaceholder}
              value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="btn-primary flex-1">{tr.recipesSave}</button>
            <button onClick={() => { setShowForm(false); setIngredients([]); setShowScanner(false) }}
              className="btn-secondary">{tr.recipesCancel}</button>
          </div>
        </div>
      )}

      {/* ── Recipe list ───────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="card text-center text-cream-400 text-sm py-10">
          <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
          {tr.recipesEmpty}
        </div>
      )}
      <div className="space-y-2">
        {filtered.sort((a, b) => b.usageCount - a.usageCount).map((r) => {
          const cat = CATEGORIES.find((c) => c.id === r.category)
          const hasStructured = Array.isArray(r.ingredients) &&
            r.ingredients.length > 0 && typeof r.ingredients[0] === 'object'
          return (
            <div key={r.id} className="card-sm">
              <div className="flex items-start justify-between">
                <button className="flex-1 min-w-0 text-left" onClick={() => setPreviewRecipe(r)}>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{r.name}</p>
                    {r.isFavorite && <Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                    {hasStructured && (
                      <span className="text-[9px] bg-accent-green/15 text-accent-green px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                        Smart
                      </span>
                    )}
                    {r.usageCount > 0 && (
                      <span className="text-[10px] text-cream-400 bg-cream-100 px-1.5 py-0.5 rounded-full shrink-0">
                        {r.usageCount}×
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-cream-400 font-mono mt-0.5">
                    {r.kcalPerServing} kcal · F {r.fatGPerServing}g · P {r.proteinGPerServing}g · C {r.carbsGPerServing}g
                  </p>
                  {r.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {r.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-cream-100 border border-cream-200 rounded-full px-2 py-0.5">{tag}</span>
                      ))}
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <button onClick={() => updateRecipe(r.id, { isFavorite: !r.isFavorite })}
                    className="text-cream-300 hover:text-yellow-400 transition-colors">
                    <Star size={14} className={r.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''} />
                  </button>
                  <button onClick={() => removeRecipe(r.id)}
                    className="text-cream-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Overlay */}
      {previewRecipe && (
        <RecipeAddOverlay
          recipe={previewRecipe}
          onConfirm={handleOverlayConfirm}
          onClose={() => setPreviewRecipe(null)}
        />
      )}
    </div>
  )
}
