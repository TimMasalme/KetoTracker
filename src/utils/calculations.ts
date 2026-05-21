import type { UserProfile, MacroTargets, MacroEntry, SportEntry, DayRating } from '@/types'

// ─── TDEE / MACRO CALCULATION ──────────────────────────────────────────────────
const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light:     1.375,
  moderate:  1.55,
  active:    1.725,
}

export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--
  return age
}

/** Mifflin-St Jeor BMR (gender-aware) */
export function calculateBMR(profile: UserProfile, currentWeightKg: number): number {
  const age = calculateAge(profile.birthDate)
  // Male: +5, Female: -161
  const genderOffset = profile.gender === 'female' ? -161 : 5
  return 10 * currentWeightKg + 6.25 * profile.heightCm - 5 * age + genderOffset
}

export function calculateTDEE(profile: UserProfile, currentWeightKg: number): number {
  const bmr = calculateBMR(profile, currentWeightKg)
  return Math.round(bmr * ACTIVITY_MULTIPLIER[profile.activityLevel])
}

export function calculateMacroTargets(
  profile: UserProfile,
  currentWeightKg?: number
): MacroTargets {
  const weight = currentWeightKg ?? profile.startWeightKg
  const tdee = calculateTDEE(profile, weight)

  const deficit = profile.goal === 'weightloss' ? 400 : 0
  const kcal = tdee - deficit

  const proteinG = Math.round(weight * 1.6)
  const carbsG = 20
  const fiberG = 25
  const remainingKcal = kcal - proteinG * 4 - carbsG * 4
  const fatG = Math.round(remainingKcal / 9)

  return { kcal, fatG, proteinG, carbsG, fiberG }
}

// ─── BODY FAT (US Navy Method) ────────────────────────────────────────────────
/** Gender-aware US Navy body-fat formula.
 *  Male:   86.01 * log10(waist - neck) - 70.041 * log10(height) + 36.76
 *  Female: 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387
 */
export function calculateBodyFatPercent(
  waistCm: number,
  neckCm: number,
  heightCm: number,
  gender: 'male' | 'female' = 'male',
  hipCm?: number
): number {
  let bf: number
  if (gender === 'female' && hipCm) {
    bf =
      163.205 * Math.log10(waistCm + hipCm - neckCm) -
      97.684 * Math.log10(heightCm) -
      78.387
  } else {
    bf =
      86.01 * Math.log10(waistCm - neckCm) -
      70.041 * Math.log10(heightCm) +
      36.76
  }
  return Math.max(0, Math.round(bf * 10) / 10)
}

// ─── NET CARBS ────────────────────────────────────────────────────────────────
/** Net carbs = total carbs - fiber. For zero-carb sweeteners (erythritol etc.)
 *  the caller should pass fiberG = carbsG so net = 0. */
export function netCarbs(carbsG: number, fiberG: number): number {
  return Math.max(0, carbsG - fiberG)
}

// ─── DAY RATING ────────────────────────────────────────────────────────────────
export function rateDayMacros(
  entries: MacroEntry[],
  sport: SportEntry[],
  targets: MacroTargets
): DayRating['rating'] {
  const totals = sumMacros(entries)
  const burned = sport.reduce((s, e) => s + (e.kcalBurned ?? 0), 0)
  const netKcal = totals.kcal - burned
  const nc = netCarbs(totals.carbsG, totals.fiberG)

  const carbsOk   = nc <= targets.carbsG
  // netKcal within 70-100% of target (sport already subtracted, so we compare net)
  const kcalOk    = netKcal <= targets.kcal && netKcal >= targets.kcal * 0.7
  const proteinOk = totals.proteinG >= targets.proteinG * 0.85

  const score = [carbsOk, kcalOk, proteinOk].filter(Boolean).length

  if (score === 3 && carbsOk) return 'excellent'
  if (score === 3) return 'good'
  if (score === 2) return 'okay'
  return 'bad'
}

export function sumMacros(entries: MacroEntry[]) {
  return entries.reduce(
    (acc, e) => ({
      kcal:     acc.kcal + e.kcal,
      fatG:     acc.fatG + e.fatG,
      proteinG: acc.proteinG + e.proteinG,
      carbsG:   acc.carbsG + e.carbsG,
      fiberG:   acc.fiberG + e.fiberG,
    }),
    { kcal: 0, fatG: 0, proteinG: 0, carbsG: 0, fiberG: 0 }
  )
}

// ─── FASTING ──────────────────────────────────────────────────────────────────
export function getFastingElapsed(startTime: string): number {
  return (Date.now() - new Date(startTime).getTime()) / 1000 / 3600
}

export function formatFastingTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
/** Returns YYYY-MM-DD in the user's LOCAL timezone — not UTC. */
export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDisplayDate(dateStr: string, lang = 'de'): string {
  const locale = lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : lang
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}
