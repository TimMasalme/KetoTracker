import { useState, useRef, useEffect } from 'react'
import { ScanBarcode, Loader2, AlertCircle, Search, X, KeyboardIcon } from 'lucide-react'
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

async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const customFoods = JSON.parse(localStorage.getItem('customFoods') || '{}')
    if (customFoods[barcode]) return customFoods[barcode]

    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,nutriments,serving_size`,
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    const p = data.product
    const n = p.nutriments ?? {}
    return {
      name:           p.product_name ?? 'Unbekanntes Produkt',
      kcalPer100g:    n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
      fatPer100g:     n['fat_100g'] ?? 0,
      proteinPer100g: n['proteins_100g'] ?? 0,
      carbsPer100g:   n['carbohydrates_100g'] ?? 0,
      fiberPer100g:   n['fiber_100g'] ?? 0,
      servingSizeG:   p.serving_size ? parseFloat(p.serving_size) || undefined : undefined,
    }
  } catch {
    return null
  }
}

/** Returns traffic-light color based on carbs in the actual portion */
function carbsTrafficLight(carbsG: number): { color: string; bg: string; label: string; emoji: string } {
  if (carbsG <= 3)  return { color: 'text-green-700',  bg: 'bg-green-50  border-green-200',  label: 'Keto-freundlich', emoji: '🟢' }
  if (carbsG <= 8)  return { color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200',  label: 'Mit Maß okay',    emoji: '🟡' }
  return             { color: 'text-red-700',    bg: 'bg-red-50    border-red-200',    label: 'Zu viele Carbs',  emoji: '🔴' }
}

export default function KetoCheckerPage() {
  const lang = useKetoStore((s) => s.lang)
  const tr   = t[lang]

  // Camera states
  const [camState, setCamState] = useState<'starting' | 'active' | 'denied' | 'unavailable'>('starting')
  const [showManual, setShowManual] = useState(false)
  const [manualInput, setManualInput] = useState('')

  // Product states
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [product, setProduct]   = useState<ProductInfo | null>(null)
  const [portionG, setPortionG] = useState(100)
  const [scanned, setScanned]   = useState('')

  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-start camera when page mounts
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
    setCamState('starting')
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // @ts-ignore
      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue
              stopCamera()
              await fetchProduct(code)
            }
          } catch { /* ignore frame errors */ }
        }, 400)
        setCamState('active')
      } else {
        stopCamera()
        setCamState('unavailable')
        setShowManual(true)
      }
    } catch (err) {
      const denied = err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setCamState(denied ? 'denied' : 'unavailable')
      setShowManual(true)
    }
  }

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function fetchProduct(code: string) {
    if (!code.trim()) return
    setScanned(code)
    setLoading(true)
    setError('')
    setProduct(null)
    const result = await lookupBarcode(code.trim())
    setLoading(false)
    if (!result) {
      setError(
        lang === 'de'
          ? 'Produkt nicht gefunden. Versuche einen anderen Barcode.'
          : 'Product not found. Try a different barcode.',
      )
    } else {
      setProduct(result)
      setPortionG(result.servingSizeG ?? 100)
    }
  }

  function resetScan() {
    setProduct(null)
    setError('')
    setScanned('')
    setManualInput('')
    setShowManual(false)
    startCamera()
  }

  // Computed values
  const factor      = portionG / 100
  const carbsActual = product ? Math.round(product.carbsPer100g * factor * 10) / 10 : 0
  const traffic     = product ? carbsTrafficLight(carbsActual) : null

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-900 flex items-center gap-2">
          <ScanBarcode size={22} className="text-accent-green" />
          Keto-Checker
        </h1>
        <p className="text-xs text-cream-400 mt-0.5">
          {lang === 'de'
            ? 'Scanne ein Produkt — sieh sofort ob es keto-tauglich ist'
            : "Scan a product — see instantly if it's keto-friendly"}
        </p>
      </div>

      {/* ── Camera / result area ── */}
      {!product && !loading && (
        <div className="relative rounded-2xl overflow-hidden bg-charcoal-900 aspect-[4/3]">
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Scanning overlay */}
          {camState === 'active' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
              {/* Viewfinder */}
              <div className="relative w-56 h-28 border-2 border-white/70 rounded-xl">
                {/* Corner decorations */}
                {['top-left','top-right','bottom-left','bottom-right'].map((pos) => (
                  <span
                    key={pos}
                    className={`absolute w-5 h-5 border-white
                      ${pos.includes('top')    ? 'top-[-2px]'    : 'bottom-[-2px]'}
                      ${pos.includes('left')   ? 'left-[-2px]'   : 'right-[-2px]'}
                      ${pos.includes('top')    ? 'border-t-4'    : 'border-b-4'}
                      ${pos.includes('left')   ? 'border-l-4'    : 'border-r-4'}
                      ${pos.includes('top') && pos.includes('left')     ? 'rounded-tl-lg' : ''}
                      ${pos.includes('top') && pos.includes('right')    ? 'rounded-tr-lg' : ''}
                      ${pos.includes('bottom') && pos.includes('left')  ? 'rounded-bl-lg' : ''}
                      ${pos.includes('bottom') && pos.includes('right') ? 'rounded-br-lg' : ''}
                    `}
                  />
                ))}
                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-accent-green/80 rounded animate-scan-line" />
              </div>
              <p className="text-white/70 text-xs bg-black/40 px-3 py-1 rounded-full">
                {lang === 'de' ? 'Barcode im Rahmen ausrichten' : 'Align barcode within frame'}
              </p>
            </div>
          )}

          {/* Starting state */}
          {camState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal-900/80">
              <Loader2 size={32} className="animate-spin text-white/60" />
              <p className="text-white/60 text-sm">
                {lang === 'de' ? 'Kamera wird gestartet…' : 'Starting camera…'}
              </p>
            </div>
          )}

          {/* Denied / unavailable */}
          {(camState === 'denied' || camState === 'unavailable') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal-900/90 px-6 text-center">
              <AlertCircle size={28} className="text-amber-400" />
              <p className="text-white/80 text-sm font-medium">
                {camState === 'denied'
                  ? (lang === 'de' ? 'Kamerazugriff verweigert' : 'Camera access denied')
                  : (lang === 'de' ? 'Kamera nicht verfügbar' : 'Camera unavailable')}
              </p>
              <p className="text-white/50 text-xs">
                {lang === 'de'
                  ? 'Bitte Barcode manuell eingeben'
                  : 'Please enter barcode manually'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="card flex flex-col items-center gap-3 py-10">
          <Loader2 size={28} className="animate-spin text-accent-green" />
          <p className="text-sm text-cream-400">
            {lang === 'de' ? 'Produkt wird geladen…' : 'Loading product…'}
          </p>
          {scanned && (
            <p className="text-xs text-cream-300 font-mono">{scanned}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-xl p-3 border border-red-100">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── RESULT CARD ── */}
      {product && traffic && (
        <div className="space-y-3 fade-up">
          {/* Traffic light banner */}
          <div className={`rounded-2xl border p-4 flex items-center gap-4 ${traffic.bg}`}>
            <span className="text-4xl">{traffic.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-charcoal-900 text-sm leading-tight truncate">
                {product.name}
              </p>
              <p className={`text-xl font-display font-bold mt-0.5 ${traffic.color}`}>
                {carbsActual}g Carbs
              </p>
              <p className={`text-xs font-medium ${traffic.color}`}>
                {traffic.label} · bei {portionG}g Portion
              </p>
            </div>
          </div>

          {/* Portion slider */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-charcoal-800">
                {lang === 'de' ? 'Portionsgröße' : 'Portion size'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={portionG}
                  onChange={(e) => setPortionG(Math.max(1, Number(e.target.value)))}
                  className="input w-20 text-center text-sm py-1"
                />
                <span className="text-xs text-cream-400">g</span>
              </div>
            </div>
            <input
              type="range"
              min={5}
              max={500}
              step={5}
              value={portionG}
              onChange={(e) => setPortionG(Number(e.target.value))}
              className="w-full accent-accent-green"
            />
            {product.servingSizeG && (
              <button
                onClick={() => setPortionG(product.servingSizeG!)}
                className="text-xs text-accent-green underline"
              >
                {lang === 'de' ? `Standard-Portion: ${product.servingSizeG}g` : `Standard serving: ${product.servingSizeG}g`}
              </button>
            )}
          </div>

          {/* Macro grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'kcal', value: Math.round(product.kcalPer100g * factor) },
              { label: 'Fett', value: `${Math.round(product.fatPer100g * factor * 10) / 10}g` },
              { label: 'Prot', value: `${Math.round(product.proteinPer100g * factor * 10) / 10}g` },
              { label: 'Carbs', value: `${carbsActual}g`, highlight: true },
            ].map((m) => (
              <div
                key={m.label}
                className={`rounded-xl p-2.5 text-center border
                  ${m.highlight ? traffic.bg : 'bg-cream-50 border-cream-200'}`}
              >
                <p className="text-[10px] text-cream-400 uppercase tracking-wide">{m.label}</p>
                <p className={`font-mono font-semibold text-sm mt-0.5 ${m.highlight ? traffic.color : 'text-charcoal-900'}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {/* Carb breakdown per 100g note */}
          <p className="text-xs text-cream-400 text-center">
            {lang === 'de'
              ? `Pro 100g: ${product.carbsPer100g}g Carbs · Ballaststoffe: ${product.fiberPer100g}g`
              : `Per 100g: ${product.carbsPer100g}g carbs · Fiber: ${product.fiberPer100g}g`}
          </p>

          {/* Scan again */}
          <button
            onClick={resetScan}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <ScanBarcode size={16} />
            {lang === 'de' ? 'Nächstes Produkt scannen' : 'Scan next product'}
          </button>
        </div>
      )}

      {/* ── Manual input button (bottom-right FAB style) ── */}
      {!product && !loading && (
        <>
          {showManual ? (
            <div className="card space-y-3 fade-up">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-charcoal-800 flex items-center gap-2">
                  <KeyboardIcon size={15} />
                  {lang === 'de' ? 'Barcode manuell eingeben' : 'Enter barcode manually'}
                </span>
                <button
                  onClick={() => setShowManual(false)}
                  className="text-cream-400 hover:text-charcoal-900"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  type="number"
                  placeholder="z.B. 4006381333207"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProduct(manualInput)}
                  autoFocus
                />
                <button
                  onClick={() => fetchProduct(manualInput)}
                  disabled={!manualInput.trim() || loading}
                  className="btn-primary px-3"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>
          ) : (
            /* FAB-style "Manuell" button */
            <div className="flex justify-end">
              <button
                onClick={() => setShowManual(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl
                  bg-white border border-cream-200 text-charcoal-700
                  hover:bg-cream-100 shadow-sm transition-all"
              >
                <KeyboardIcon size={13} />
                {lang === 'de' ? 'Manuell' : 'Manual'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
