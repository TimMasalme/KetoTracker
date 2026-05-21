import { useState, useRef, useEffect } from 'react'
import { Barcode, X, Search, Loader2, ChevronDown, ChevronUp, AlertCircle, Camera } from 'lucide-react'
import { useKetoStore } from '@/store'
import { t } from '@/i18n'

interface ProductInfo {
  name: string
  kcalPer100g: number
  fatPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fiberPer100g: number
  servingSizeG?: number
}

interface Props {
  onAdd: (entry: {
    name: string
    kcal: number
    fatG: number
    proteinG: number
    carbsG: number
    fiberG: number
    notes?: string
  }) => void
  onClose: () => void
}

async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  try {

    // ZUERST lokale gespeicherte Werte prüfen
    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}')

    if (customFoods[barcode]) {
      return customFoods[barcode]
    }
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,nutriments,serving_size`,
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const n = p.nutriments ?? {}
    return {
      name:          p.product_name ?? 'Unbekanntes Produkt',
      kcalPer100g:   n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
      fatPer100g:    n['fat_100g'] ?? 0,
      proteinPer100g:n['proteins_100g'] ?? 0,
      carbsPer100g:  n['carbohydrates_100g'] ?? 0,
      fiberPer100g:  n['fiber_100g'] ?? 0,
      servingSizeG:  p.serving_size ? parseFloat(p.serving_size) || undefined : undefined,
    }
  } catch {
    return null
  }
}

export default function BarcodeScanner({ onAdd, onClose }: Props) {
  const lang = useKetoStore((s) => s.lang)
  const tr   = t[lang]

  const [mode, setMode]               = useState<'manual' | 'camera'>('manual')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [product, setProduct]         = useState<ProductInfo | null>(null)
  const [savedMessage, setSavedMessage] = useState('')
  const [portions, setPortions]       = useState(1)
  const [gramInput, setGramInput]     = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  // Permission states: 'idle' | 'requesting' | 'granted' | 'denied'
  const [camPermission, setCamPermission] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // When user switches to camera mode, first check/request permission
  function requestCameraMode() {
    setCamPermission('requesting')
    setMode('camera')
  }

  // Camera barcode scanning via BarcodeDetector API (Chrome/Android)
  useEffect(() => {
    if (mode !== 'camera') return
    let active = true

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        setCamPermission('granted')
        streamRef.current = stream
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream
        }

        // @ts-ignore – BarcodeDetector not in TS lib yet
        if ('BarcodeDetector' in window) {
          // @ts-ignore
          const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
          intervalRef.current = setInterval(async () => {
            if (!videoRef.current || !active) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue
                stopCamera()
                setMode('manual')
                setBarcodeInput(code)
                await fetchProduct(code)
              }
            } catch { /* ignore frame errors */ }
          }, 500)
        } else {
          setError(tr.scannerCameraUnavailable)
          stopCamera()
          setMode('manual')
          setCamPermission('idle')
        }
      } catch (err) {
        const isDenied = err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        setCamPermission(isDenied ? 'denied' : 'idle')
        setError(isDenied ? tr.scannerCameraDenied : tr.scannerCameraUnavailable)
        setMode('manual')
      }
    }

    startCamera()
    return () => {
      active = false
      stopCamera()
    }
  }, [mode])

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function fetchProduct(code: string) {
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setProduct(null)
    const result = await lookupBarcode(code.trim())
    setLoading(false)
    if (!result) {
      setError('Produkt nicht gefunden. Versuche einen anderen Barcode oder gib die Nährwerte manuell ein.')
    } else {
      setProduct(result)
      setGramInput(result.servingSizeG ? String(result.servingSizeG) : '100')
      setPortions(1)
    }
  }

  function handleSaveMacros() {
  if (!product || !barcodeInput.trim()) return

  const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}')

  customFoods[barcodeInput] = {
    ...product,
  }

  localStorage.setItem('customFoods', JSON.stringify(customFoods))

  setSavedMessage('Makros gespeichert ✓')

  setTimeout(() => {
    setSavedMessage('')
  }, 2500)
}

  // Compute macros for current gram/portion selection
  function getMacros() {
    if (!product) return null
    const g = parseFloat(gramInput) || 100
    const factor = (g / 100) * portions
    return {
      kcal:     Math.round(product.kcalPer100g    * factor),
      fatG:     Math.round(product.fatPer100g     * factor * 10) / 10,
      proteinG: Math.round(product.proteinPer100g * factor * 10) / 10,
      carbsG:   Math.round(product.carbsPer100g   * factor * 10) / 10,
      fiberG:   Math.round(product.fiberPer100g   * factor * 10) / 10,
    }
  }

  function handleAdd() {
    if (!product) return
    const m = getMacros()!
    onAdd({
      name: product.name,
      ...m,
      notes: `${parseFloat(gramInput) * portions}g (${portions}×)`,
    })
  }

  const macros = getMacros()

  return (
    <div className="card space-y-4 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Barcode size={16} />
          Barcode Scanner
        </h3>
        <button onClick={onClose} className="text-cream-400 hover:text-charcoal-900">
          <X size={18} />
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('manual'); stopCamera(); setCamPermission('idle') }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
            ${mode === 'manual'
              ? 'bg-charcoal-900 text-cream-50 border-charcoal-900'
              : 'border-cream-300 text-charcoal-800 hover:bg-cream-100'}`}
        >
          {tr.scannerTabManual}
        </button>
        <button
          onClick={requestCameraMode}
          className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
            ${mode === 'camera'
              ? 'bg-charcoal-900 text-cream-50 border-charcoal-900'
              : 'border-cream-300 text-charcoal-800 hover:bg-cream-100'}`}
        >
          📷 {tr.scannerTabCamera}
        </button>
      </div>

      {/* Permission request overlay */}
      {camPermission === 'requesting' && mode !== 'camera' && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Camera size={32} className="text-charcoal-700" />
          <p className="text-sm font-medium text-charcoal-900">
            {lang === 'de' ? 'Kamera-Berechtigung erforderlich' : 'Camera permission required'}
          </p>
          <p className="text-xs text-cream-400">
            {lang === 'de'
              ? 'Bitte erlaube den Kamerazugriff im Browser-Dialog.'
              : 'Please allow camera access in the browser dialog.'}
          </p>
          <Loader2 size={20} className="animate-spin text-cream-400" />
        </div>
      )}

      {/* Camera denied hint */}
      {camPermission === 'denied' && (
        <div className="flex items-start gap-2 text-amber-700 text-xs bg-amber-50 rounded-xl p-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>
            {lang === 'de'
              ? 'Kamerazugriff verweigert. Bitte in den Browser-Einstellungen erlauben und dann erneut versuchen.'
              : 'Camera access denied. Please allow it in your browser settings and try again.'}
          </span>
        </div>
      )}

      {/* Camera view */}
      {mode === 'camera' && camPermission === 'granted' && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white/60 rounded-lg w-2/3 h-16 flex items-center justify-center">
              <span className="text-white/70 text-xs">{tr.scannerAlignHint}</span>
            </div>
          </div>
        </div>
      )}

      {/* Manual barcode input */}
      {mode === 'manual' && (
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder={tr.scannerBarcodePlaceholder}
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProduct(barcodeInput)}
            type="number"
          />
          <button
            onClick={() => fetchProduct(barcodeInput)}
            disabled={loading}
            className="btn-primary px-3 flex items-center gap-1.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Product result */}
      {product && (
        <div className="space-y-4">
          {/* Product name */}
<div className="bg-cream-50 rounded-xl px-4 py-3 space-y-3">

  <p className="font-semibold text-sm">{product.name}</p>

  <div className="grid grid-cols-2 gap-3">

    <div>
      <label className="label">kcal / 100g</label>
      <input
        className="input"
        type="number"
        value={product.kcalPer100g}
        onChange={(e) =>
          setProduct({
            ...product,
            kcalPer100g: Number(e.target.value),
          })
        }
      />
    </div>

    <div>
      <label className="label">Fett</label>
      <input
        className="input"
        type="number"
        step="0.1"
        value={product.fatPer100g}
        onChange={(e) =>
          setProduct({
            ...product,
            fatPer100g: Number(e.target.value),
          })
        }
      />
    </div>

    <div>
      <label className="label">Protein</label>
      <input
        className="input"
        type="number"
        step="0.1"
        value={product.proteinPer100g}
        onChange={(e) =>
          setProduct({
            ...product,
            proteinPer100g: Number(e.target.value),
          })
        }
      />
    </div>

    <div>
      <label className="label">Carbs</label>
      <input
        className="input"
        type="number"
        step="0.1"
        value={product.carbsPer100g}
        onChange={(e) =>
          setProduct({
            ...product,
            carbsPer100g: Number(e.target.value),
          })
        }
      />
    </div>

  </div>

  <button
    onClick={handleSaveMacros}
    className="w-full rounded-xl border border-cream-300 py-2 text-sm font-medium hover:bg-cream-100 transition-colors"
  >
    Makros speichern
  </button>

  {savedMessage && (
    <p className="text-xs text-green-600 text-center font-medium">
      {savedMessage}
    </p>
  )}

</div>

          {/* Portion selector */}
          <div>
            <label className="label">Portionsgröße (Gramm)</label>
            <div className="flex gap-3 items-center">
              <input
                className="input w-28"
                type="number"
                min="1"
                value={gramInput}
                onChange={(e) => setGramInput(e.target.value)}
              />
              {product.servingSizeG && (
                <button
                  onClick={() => setGramInput(String(product.servingSizeG))}
                  className="text-xs text-accent-green underline"
                >
                  1 Portion ({product.servingSizeG}g)
                </button>
              )}
            </div>
          </div>

          {/* Portions count */}
          <div>
            <label className="label">Anzahl Portionen</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPortions((p) => Math.max(0.5, p - 0.5))}
                className="w-9 h-9 rounded-full border border-cream-300 text-lg font-bold
                  hover:bg-cream-100 transition-colors flex items-center justify-center"
              >
                −
              </button>
              <span className="font-mono text-xl font-semibold w-10 text-center">{portions}</span>
              <button
                onClick={() => setPortions((p) => p + 0.5)}
                className="w-9 h-9 rounded-full border border-cream-300 text-lg font-bold
                  hover:bg-cream-100 transition-colors flex items-center justify-center"
              >
                +
              </button>
            </div>
            <p className="text-xs text-cream-400 mt-1">
              Gesamt: {(parseFloat(gramInput) || 0) * portions}g
            </p>
          </div>

          {/* Macro preview */}
          {macros && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'kcal', value: macros.kcal },
                { label: 'Fett', value: `${macros.fatG}g` },
                { label: 'Prot', value: `${macros.proteinG}g` },
                { label: 'Carbs', value: `${macros.carbsG}g` },
              ].map((m) => (
                <div key={m.label} className="bg-cream-50 rounded-xl p-2 text-center">
                  <p className="text-xs text-cream-400">{m.label}</p>
                  <p className="font-mono font-semibold text-sm">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleAdd} className="btn-primary w-full">
            Zum Log hinzufügen
          </button>
        </div>
      )}

      {/* Hint */}
      {!product && !loading && !error && (
        <p className="text-xs text-cream-400 text-center">
          Daten via <span className="font-medium">Open Food Facts</span> — kostenfrei &amp; offen
        </p>
      )}
    </div>
  )
}
