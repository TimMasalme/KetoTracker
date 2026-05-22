export interface SyncPayload {
  version: 1
  deviceId: string
  timestamp: number
  data: {
    foodLog: unknown[]
    recipes: unknown[]
    weightLog: unknown[]
    fastingSessions: unknown[]
    sportLog: unknown[]
    profile: unknown
    macroTargets: unknown
  }
}

export type SyncStatus =
  | 'idle'
  | 'hosting'      // QR shown, waiting for peer
  | 'connecting'   // dialing peer
  | 'connected'
  | 'syncing'
  | 'done'
  | 'error'

export interface SyncState {
  deviceId: string
  status: SyncStatus
  errorMsg: string | null
  lastSyncedAt: number | null
  linkedDeviceId: string | null
}
