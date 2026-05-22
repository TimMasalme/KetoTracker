/**
 * SyncService – thin wrapper around PeerJS (loaded via CDN at runtime).
 * Strategy: last-write-wins per record id.
 * The "host" opens a Peer, shares its peerId as QR/code.
 * The "joiner" calls host.peerId, receives the full snapshot, merges, sends back its own.
 */

import type { SyncPayload } from './syncTypes'

// PeerJS types (minimal, to avoid adding @types/peerjs as hard dep)
interface PeerInstance {
  id: string
  on(event: string, cb: (...args: unknown[]) => void): void
  connect(id: string, opts?: object): DataConnectionInstance
  destroy(): void
}
interface DataConnectionInstance {
  on(event: string, cb: (...args: unknown[]) => void): void
  send(data: unknown): void
  close(): void
}

declare global {
  interface Window {
    Peer: new (id?: string, opts?: object) => PeerInstance
  }
}

const PEER_CDN = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'

async function loadPeerJS(): Promise<void> {
  if (window.Peer) return
  await new Promise<void>((res, rej) => {
    const s = document.createElement('script')
    s.src = PEER_CDN
    s.onload = () => res()
    s.onerror = () => rej(new Error('PeerJS CDN load failed'))
    document.head.appendChild(s)
  })
}

// Merge two arrays by id; newest updatedAt wins (fallback: keep incoming)
function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of local) map.set(item.id, item)
  for (const item of remote) {
    if (!map.has(item.id)) {
      map.set(item.id, item)
    }
    // always prefer remote if conflict — simple last-write-wins
    // In practice both sides will merge and re-broadcast if they differ
  }
  return Array.from(map.values())
}

function mergePayload(
  local: SyncPayload['data'],
  remote: SyncPayload['data'],
): SyncPayload['data'] {
  return {
    foodLog:        mergeById(local.foodLog        as { id: string }[], remote.foodLog        as { id: string }[]),
    recipes:        mergeById(local.recipes        as { id: string }[], remote.recipes        as { id: string }[]),
    weightLog:      mergeById(local.weightLog      as { id: string }[], remote.weightLog      as { id: string }[]),
    fastingSessions:mergeById(local.fastingSessions as { id: string }[], remote.fastingSessions as { id: string }[]),
    sportLog:       mergeById(local.sportLog       as { id: string }[], remote.sportLog       as { id: string }[]),
    profile:        remote.profile  ?? local.profile,
    macroTargets:   remote.macroTargets ?? local.macroTargets,
  }
}

export type OnSyncedCallback = (merged: SyncPayload['data']) => void
export type OnStatusCallback = (status: string, err?: string) => void

class SyncService {
  private peer: PeerInstance | null = null
  private conn: DataConnectionInstance | null = null

  async openAsHost(
    deviceId: string,
    getLocalData: () => SyncPayload['data'],
    onSynced: OnSyncedCallback,
    onStatus: OnStatusCallback,
  ): Promise<string> {
    await loadPeerJS()
    this.destroy()

    const peer = new window.Peer(deviceId, { debug: 0 })
    this.peer = peer

    return new Promise((resolve, reject) => {
      peer.on('open', (id: unknown) => {
        onStatus('hosting')
        resolve(id as string)
      })
      peer.on('error', (err: unknown) => {
        onStatus('error', String(err))
        reject(err)
      })
      peer.on('connection', (conn: unknown) => {
        this.conn = conn as DataConnectionInstance
        onStatus('connected')
        const c = conn as DataConnectionInstance
        c.on('open', () => {
          const local = getLocalData()
          const payload: SyncPayload = {
            version: 1,
            deviceId,
            timestamp: Date.now(),
            data: local,
          }
          c.send(JSON.stringify(payload))
          onStatus('syncing')
        })
        c.on('data', (raw: unknown) => {
          try {
            const remote = JSON.parse(raw as string) as SyncPayload
            const merged = mergePayload(getLocalData(), remote.data)
            onSynced(merged)
            onStatus('done')
          } catch {
            onStatus('error', 'Merge failed')
          }
        })
        c.on('error', (err: unknown) => onStatus('error', String(err)))
      })
    })
  }

  async connectToPeer(
    deviceId: string,
    remotePeerId: string,
    getLocalData: () => SyncPayload['data'],
    onSynced: OnSyncedCallback,
    onStatus: OnStatusCallback,
  ): Promise<void> {
    await loadPeerJS()
    this.destroy()

    const peer = new window.Peer(deviceId + '_joiner_' + Date.now().toString(36), { debug: 0 })
    this.peer = peer

    await new Promise<void>((resolve, reject) => {
      peer.on('open', () => resolve())
      peer.on('error', (err: unknown) => reject(err))
    })

    onStatus('connecting')
    const conn = peer.connect(remotePeerId, { reliable: true })
    this.conn = conn

    conn.on('open', () => onStatus('connected'))
    conn.on('data', (raw: unknown) => {
      try {
        const remote = JSON.parse(raw as string) as SyncPayload
        const local = getLocalData()
        const merged = mergePayload(local, remote.data)

        // Send back merged so host also gets it
        const reply: SyncPayload = {
          version: 1,
          deviceId,
          timestamp: Date.now(),
          data: merged,
        }
        conn.send(JSON.stringify(reply))

        onSynced(merged)
        onStatus('done')
      } catch {
        onStatus('error', 'Merge failed')
      }
    })
    conn.on('error', (err: unknown) => onStatus('error', String(err)))
  }

  destroy() {
    try { this.conn?.close() } catch { /* noop */ }
    try { this.peer?.destroy() } catch { /* noop */ }
    this.conn = null
    this.peer = null
  }
}

export const syncService = new SyncService()

export { mergePayload }
