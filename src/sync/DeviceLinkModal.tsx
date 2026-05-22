import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Wifi, Link, CheckCircle, AlertCircle, Loader2, Smartphone } from 'lucide-react'
import { useSyncStore } from '@/sync/useSyncStore'
import { syncService } from '@/sync/syncService'
import { useKetoStore } from '@/store'
import type { SyncPayload } from '@/sync/syncTypes'
import { t } from '@/i18n'

// ─── QR helper (qrcode.js via CDN) ──────────────────────────────────────────
declare global {
  interface Window {
    QRCode: new (el: HTMLElement, opts: object) => void
  }
}

async function renderQR(el: HTMLElement, text: string) {
  if (!window.QRCode) {
    await new Promise<void>((res, rej) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
      s.onload = () => res()
      s.onerror = () => rej()
      document.head.appendChild(s)
    })
  }
  el.innerHTML = ''
  new window.QRCode(el, {
    text,
    width: 180,
    height: 180,
    colorDark: '#1a1a1a',
    colorLight: '#faf9f6',
    correctLevel: 2,
  })
}

// ─── Store snapshot helper ───────────────────────────────────────────────────
function getLocalData(): SyncPayload['data'] {
  const s = useKetoStore.getState()
  return {
    foodLog:         s.foodLog,
    recipes:         s.recipes,
    weightLog:       s.weightLog,
    fastingSessions: s.fastingSessions,
    sportLog:        s.sportLog,
    profile:         s.profile,
    macroTargets:    s.macroTargets,
  }
}

function applyMergedData(merged: SyncPayload['data']) {
  const s = useKetoStore.getState()
  // Direct setState — bypass individual setters to do it atomically
  useKetoStore.setState({
    foodLog:         merged.foodLog         as typeof s.foodLog,
    recipes:         merged.recipes         as typeof s.recipes,
    weightLog:       merged.weightLog       as typeof s.weightLog,
    fastingSessions: merged.fastingSessions as typeof s.fastingSessions,
    sportLog:        merged.sportLog        as typeof s.sportLog,
    ...(merged.profile      ? { profile:      merged.profile      as typeof s.profile      } : {}),
    ...(merged.macroTargets ? { macroTargets: merged.macroTargets as typeof s.macroTargets } : {}),
  })
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props { onClose: () => void }

type Mode = 'choose' | 'host' | 'join'

export default function DeviceLinkModal({ onClose }: Props) {
  const deviceId     = useSyncStore((s) => s.deviceId)
  const status       = useSyncStore((s) => s.status)
  const errorMsg     = useSyncStore((s) => s.errorMsg)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const setStatus    = useSyncStore((s) => s.setStatus)
  const setLastSynced= useSyncStore((s) => s.setLastSynced)
  const resetSession = useSyncStore((s) => s.resetSession)

  const lang = useKetoStore((s) => s.lang)
  const tr   = t[lang]

  const [mode, setMode] = useState<Mode>('choose')
  const [joinCode, setJoinCode] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)

  // ── Host flow ──
  const startHost = useCallback(async () => {
    setMode('host')
    setStatus('hosting')
    try {
      await syncService.openAsHost(
        deviceId,
        getLocalData,
        (merged) => { applyMergedData(merged); setLastSynced() },
        (s, err) => setStatus(s as Parameters<typeof setStatus>[0], err),
      )
    } catch (e) {
      setStatus('error', String(e))
    }
  }, [deviceId, setStatus, setLastSynced])

  // ── Joiner flow ──
  const startJoin = useCallback(async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    setStatus('connecting')
    try {
      await syncService.connectToPeer(
        deviceId,
        code,
        getLocalData,
        (merged) => { applyMergedData(merged); setLastSynced() },
        (s, err) => setStatus(s as Parameters<typeof setStatus>[0], err),
      )
    } catch (e) {
      setStatus('error', String(e))
    }
  }, [deviceId, joinCode, setStatus, setLastSynced])

  // Render QR when in host mode
  useEffect(() => {
    if (mode === 'host' && qrRef.current && (status === 'hosting' || status === 'connected')) {
      renderQR(qrRef.current, deviceId).catch(() => {
        // QR failed — code-only fallback is already shown
      })
    }
  }, [mode, status, deviceId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (status !== 'done') {
        syncService.destroy()
        resetSession()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClose = () => {
    syncService.destroy()
    resetSession()
    onClose()
  }

  // ── Status badge ──
  function StatusBadge() {
    if (status === 'idle' || status === 'hosting') return null
    const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
      connecting: { icon: <Loader2 size={14} className="animate-spin" />, cls: 'text-amber-600 bg-amber-50 border-amber-200', label: tr.syncConnecting },
      connected:  { icon: <Wifi size={14} />,                            cls: 'text-blue-600 bg-blue-50 border-blue-200',   label: tr.syncConnected  },
      syncing:    { icon: <Loader2 size={14} className="animate-spin" />, cls: 'text-blue-600 bg-blue-50 border-blue-200',   label: tr.syncSyncing    },
      done:       { icon: <CheckCircle size={14} />,                      cls: 'text-green-700 bg-green-50 border-green-200',label: tr.syncDone       },
      error:      { icon: <AlertCircle size={14} />,                      cls: 'text-red-600 bg-red-50 border-red-200',      label: errorMsg ?? tr.syncError },
    }
    const s = map[status]
    if (!s) return null
    return (
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${s.cls}`}>
        {s.icon} {s.label}
      </div>
    )
  }

  return createPortal(
    <div
      onClick={(e) => e.target === e.currentTarget && handleClose()}
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
          maxWidth: 420,
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-cream-50, #faf9f6)',
          borderRadius: '20px',
          boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cream-200">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-accent-green" />
            <h2 className="font-semibold text-sm">{tr.linkDevicesTitle}</h2>
          </div>
          <button onClick={handleClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">

          {/* Your device ID */}
          <div className="bg-cream-100 rounded-xl p-3 text-center">
            <p className="text-xs text-cream-400 mb-1">{tr.yourDeviceId}</p>
            <p className="font-mono font-bold text-lg tracking-widest text-cream-700">{deviceId}</p>
            {lastSyncedAt && (
              <p className="text-xs text-cream-400 mt-1">
                {tr.lastSynced}: {new Date(lastSyncedAt).toLocaleTimeString()}
              </p>
            )}
          </div>

          <StatusBadge />

          {/* Sync done */}
          {status === 'done' && (
            <button onClick={handleClose} className="btn-primary w-full flex items-center justify-center gap-2">
              <CheckCircle size={16} /> {tr.syncDone}
            </button>
          )}

          {/* Choose mode */}
          {mode === 'choose' && status !== 'done' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={startHost}
                className="card flex flex-col items-center gap-2 p-4 hover:border-accent-green/40 transition-colors cursor-pointer text-center"
              >
                <Wifi size={20} className="text-accent-green" />
                <p className="text-sm font-semibold">{tr.syncHostTitle}</p>
                <p className="text-xs text-cream-400">{tr.syncHostDesc}</p>
              </button>
              <button
                onClick={() => setMode('join')}
                className="card flex flex-col items-center gap-2 p-4 hover:border-accent-green/40 transition-colors cursor-pointer text-center"
              >
                <Link size={20} className="text-accent-green" />
                <p className="text-sm font-semibold">{tr.syncJoinTitle}</p>
                <p className="text-xs text-cream-400">{tr.syncJoinDesc}</p>
              </button>
            </div>
          )}

          {/* Host view */}
          {mode === 'host' && status !== 'done' && (
            <div className="space-y-3">
              <p className="text-xs text-cream-400 text-center">{tr.syncHostInstructions}</p>
              {/* QR */}
              <div className="flex justify-center">
                <div ref={qrRef} className="rounded-xl overflow-hidden border border-cream-200 bg-[#faf9f6]" />
              </div>
              {/* Fallback code */}
              <div className="text-center">
                <p className="text-xs text-cream-400 mb-1">{tr.orEnterCode}</p>
                <p className="font-mono font-bold text-xl tracking-widest">{deviceId}</p>
              </div>
              {(status === 'connecting' || status === 'connected' || status === 'syncing') && (
                <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
                  <Loader2 size={14} className="animate-spin" />
                  {status === 'connecting' ? tr.syncConnecting : status === 'syncing' ? tr.syncSyncing : tr.syncConnected}
                </div>
              )}
            </div>
          )}

          {/* Join view */}
          {mode === 'join' && status !== 'done' && (
            <div className="space-y-3">
              <p className="text-xs text-cream-400">{tr.syncJoinInstructions}</p>
              <div>
                <label className="label">{tr.enterDeviceCode}</label>
                <input
                  className="input uppercase tracking-widest font-mono text-center"
                  placeholder="XXXXXX"
                  maxLength={16}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && startJoin()}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setMode('choose'); resetSession() }} className="btn-ghost">
                  {tr.back}
                </button>
                <button
                  onClick={startJoin}
                  disabled={!joinCode.trim() || status === 'connecting'}
                  className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {status === 'connecting'
                    ? <><Loader2 size={14} className="animate-spin" /> {tr.syncConnecting}</>
                    : <>{tr.syncConnect}</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Error retry */}
          {status === 'error' && (
            <button
              onClick={() => { resetSession(); setMode('choose') }}
              className="btn-ghost w-full text-sm"
            >
              {tr.syncRetry}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
