import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyncStatus } from './syncTypes'

function generateDeviceId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

interface SyncStore {
  deviceId: string
  status: SyncStatus
  errorMsg: string | null
  lastSyncedAt: number | null
  linkedDeviceId: string | null

  setStatus: (status: SyncStatus, errorMsg?: string | null) => void
  setLinkedDevice: (id: string | null) => void
  setLastSynced: () => void
  resetSession: () => void
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set) => ({
      deviceId:       generateDeviceId(),
      status:         'idle',
      errorMsg:       null,
      lastSyncedAt:   null,
      linkedDeviceId: null,

      setStatus: (status, errorMsg = null) => set({ status, errorMsg }),
      setLinkedDevice: (id) => set({ linkedDeviceId: id }),
      setLastSynced: () => set({ lastSyncedAt: Date.now() }),
      resetSession: () => set({ status: 'idle', errorMsg: null }),
    }),
    {
      name: 'keto-sync-store',
      partialize: (s) => ({
        deviceId:       s.deviceId,
        lastSyncedAt:   s.lastSyncedAt,
        linkedDeviceId: s.linkedDeviceId,
      }),
    }
  )
)
