/**
 * Local Reminders
 *
 * Strategie:
 *  1. Capacitor (@capacitor/local-notifications) – wenn auf nativem Device
 *  2. Web Notification API + setTimeout – als Web/Electron-Fallback
 */

import { useEffect } from 'react'
import { useKetoStore } from '@/store'

// ─── Typen ───────────────────────────────────────────────────────────────────
export interface NotificationPrefs {
  mealReminder: boolean
  mealReminderLunch: string    // "HH:mm"
  mealReminderDinner: string   // "HH:mm"
  fastingReminder: boolean
  fastingWarnMinutes: number
  weightReminder: boolean
  weightReminderTime: string   // "HH:mm"
  lang: 'de' | 'en'
}

export interface ReminderContext {
  hasMealToday: boolean
  fastingEndTime: Date | null
  hasWeightToday: boolean
}

interface ReminderJob {
  id: number
  title: string
  body: string
  at: Date
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

function isFuture(d: Date) {
  return d.getTime() > Date.now()
}

// ─── Web-Notification Fallback ────────────────────────────────────────────────
const activeTimers: ReturnType<typeof setTimeout>[] = []

function clearWebTimers() {
  activeTimers.forEach(clearTimeout)
  activeTimers.length = 0
}

async function scheduleWebNotifications(jobs: ReminderJob[]) {
  if (!('Notification' in window)) return

  const perm = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()

  if (perm !== 'granted') throw new Error('denied')

  clearWebTimers()

  for (const job of jobs) {
    const delay = job.at.getTime() - Date.now()
    if (delay < 0) continue
    const handle = setTimeout(() => {
      new Notification(job.title, { body: job.body, icon: '/favicon.svg' })
    }, delay)
    activeTimers.push(handle)
  }
}

// ─── Capacitor Plugin ─────────────────────────────────────────────────────────
// Bugfix: @capacitor/local-notifications is now a proper dependency.
// We still use a try/catch so it gracefully falls back in web/Electron builds.
async function tryCapacitor(jobs: ReminderJob[]): Promise<boolean> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false

    // Cancel any previously scheduled reminders with matching IDs
    await LocalNotifications.cancel({
      notifications: jobs.map((j) => ({ id: j.id })),
    })

    await LocalNotifications.schedule({
      notifications: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        body: j.body,
        schedule: { at: j.at, allowWhileIdle: true },
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#5d8a5e',
      })),
    })

    return true
  } catch {
    // Not a native device or plugin unavailable – fall back to Web API
    return false
  }
}

// ─── Hauptfunktion ────────────────────────────────────────────────────────────
export async function scheduleReminders(
  prefs: NotificationPrefs,
  ctx: ReminderContext,
): Promise<void> {
  const de = prefs.lang === 'de'
  const jobs: ReminderJob[] = []

  // ── Meal Reminders ─────────────────────────────────────────────────────────
  if (prefs.mealReminder && !ctx.hasMealToday) {
    const lunch = todayAt(prefs.mealReminderLunch)
    if (isFuture(lunch)) {
      jobs.push({
        id: 1001,
        title: de ? '🥑 Noch kein Essen eingetragen' : '🥑 No meal logged yet',
        body:  de ? 'Vergiss nicht, dein Mittagessen einzutragen!' : "Don't forget to log your lunch!",
        at: lunch,
      })
    }
    const dinner = todayAt(prefs.mealReminderDinner)
    if (isFuture(dinner)) {
      jobs.push({
        id: 1002,
        title: de ? '🍽️ Abendessen eingetragen?' : '🍽️ Dinner logged?',
        body:  de ? 'Trag dein Abendessen ein, bevor der Tag endet.' : 'Log your dinner before the day ends.',
        at: dinner,
      })
    }
  }

  // ── Fasting-End Reminder ───────────────────────────────────────────────────
  if (prefs.fastingReminder && ctx.fastingEndTime) {
    const notifyAt = new Date(ctx.fastingEndTime.getTime() - prefs.fastingWarnMinutes * 60_000)
    if (isFuture(notifyAt)) {
      jobs.push({
        id: 1003,
        title: de ? '⏱️ Fasten endet gleich!' : '⏱️ Fast ending soon!',
        body:  de
          ? `Noch ${prefs.fastingWarnMinutes} Minuten bis dein Fasten endet.`
          : `${prefs.fastingWarnMinutes} minutes until your fast is complete.`,
        at: notifyAt,
      })
    }
  }

  // ── Weight Reminder ────────────────────────────────────────────────────────
  if (prefs.weightReminder && !ctx.hasWeightToday) {
    const wTime = todayAt(prefs.weightReminderTime)
    if (isFuture(wTime)) {
      jobs.push({
        id: 1004,
        title: de ? '⚖️ Gewicht eintragen' : '⚖️ Log your weight',
        body:  de ? 'Trag dein heutiges Gewicht ein!' : "Don't forget to record today's weight!",
        at: wTime,
      })
    }
  }

  if (jobs.length === 0) return

  // Capacitor zuerst (native App), sonst Web API (Browser / Electron)
  const usedCapacitor = await tryCapacitor(jobs)
  if (!usedCapacitor) {
    await scheduleWebNotifications(jobs)
  }
}

// ─── React Hook ──────────────────────────────────────────────────────────────
export function useNotifications() {
  const notifPrefs    = useKetoStore((s) => s.notifPrefs)
  const foodLog       = useKetoStore((s) => s.foodLog)
  const weightLog     = useKetoStore((s) => s.weightLog)
  const activeFasting = useKetoStore((s) => s.activeFasting)
  const lang          = useKetoStore((s) => s.lang)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)

    let fastingEndTime: Date | null = null
    if (activeFasting) {
      const start = new Date(activeFasting.startTime)
      fastingEndTime = new Date(start.getTime() + activeFasting.targetHours * 3_600_000)
    }

    scheduleReminders(
      { ...notifPrefs, lang },
      {
        hasMealToday:   foodLog.some((e) => e.date === today),
        fastingEndTime,
        hasWeightToday: weightLog.some((e) => e.date === today),
      },
    )
  }, [notifPrefs, foodLog, weightLog, activeFasting, lang])
}
