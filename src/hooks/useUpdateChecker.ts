import { useEffect, useState } from 'react'

// ─── Config ───────────────────────────────────────────────────────────────────
// Set this to your GitHub repo, e.g. "timmasalme/keto-tracker"
const GITHUB_REPO = 'YOUR_GITHUB_USERNAME/YOUR_REPO_NAME'

// Current app version – keep in sync with package.json
const CURRENT_VERSION = '1.1.0'

// Check at most once per session, with a cooldown stored in sessionStorage
const STORAGE_KEY = 'keto_update_checked'

// ─── Helper: semver compare (no deps) ────────────────────────────────────────
function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)

  const [lMaj, lMin, lPat] = parse(latest)
  const [cMaj, cMin, cPat] = parse(current)

  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPat > cPat
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export interface UpdateInfo {
  version: string       // e.g. "v1.2.0"
  releaseUrl: string    // GitHub release page URL
  releaseNotes: string  // first 400 chars of the release body
}

export function useUpdateChecker(): {
  updateInfo: UpdateInfo | null
  dismiss: () => void
} {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    // Only check once per browser session
    if (sessionStorage.getItem(STORAGE_KEY)) return
    sessionStorage.setItem(STORAGE_KEY, '1')

    const controller = new AbortController()

    async function check() {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
          {
            headers: { Accept: 'application/vnd.github+json' },
            signal: controller.signal,
          }
        )
        if (!res.ok) return

        const data = await res.json()
        const latestTag: string = data.tag_name ?? ''

        if (latestTag && isNewer(latestTag, CURRENT_VERSION)) {
          setUpdateInfo({
            version: latestTag,
            releaseUrl: data.html_url ?? `https://github.com/${GITHUB_REPO}/releases/latest`,
            releaseNotes: (data.body ?? '').slice(0, 400),
          })
        }
      } catch {
        // Network error or AbortError – silently ignore
      }
    }

    check()
    return () => controller.abort()
  }, [])

  function dismiss() {
    setUpdateInfo(null)
  }

  return { updateInfo, dismiss }
}
