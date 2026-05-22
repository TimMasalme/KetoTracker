import { useMemo } from 'react'
import { useKetoStore } from '@/store'
import { sumMacros, rateDayMacros, rateDayDetails, toDateKey, netCarbs, calculateTDEE } from '@/utils/calculations'
import type { MacroEntry, SportEntry } from '@/types'

// ─── TODAY'S DATA ─────────────────────────────────────────────────────────────
export function useToday() {
  const today = toDateKey()
  const foodLog      = useKetoStore((s) => s.foodLog)
  const sportLog     = useKetoStore((s) => s.sportLog)
  const macroTargets = useKetoStore((s) => s.macroTargets)

  const todayFood  = useMemo(() => foodLog.filter((e) => e.date === today), [foodLog, today])
  const todaySport = useMemo(() => sportLog.filter((e) => e.date === today), [sportLog, today])
  const totals     = useMemo(() => sumMacros(todayFood), [todayFood])
  const rating     = useMemo(
    () => rateDayMacros(todayFood, todaySport, macroTargets),
    [todayFood, todaySport, macroTargets]
  )
  const ratingDetails = useMemo(
    () => rateDayDetails(todayFood, todaySport, macroTargets),
    [todayFood, todaySport, macroTargets]
  )

  const netCarbsToday = netCarbs(totals.carbsG, totals.fiberG)
  const inKetosis     = netCarbsToday <= macroTargets.carbsG
  const kcalBurned    = todaySport.reduce((s, e) => s + (e.kcalBurned ?? 0), 0)

  return { today, todayFood, todaySport, totals, netCarbsToday, rating, ratingDetails, inKetosis, kcalBurned }
}

// ─── DATE RANGE LOG ───────────────────────────────────────────────────────────
export function useDateRange(days = 7) {
  const foodLog      = useKetoStore((s) => s.foodLog)
  const sportLog     = useKetoStore((s) => s.sportLog)
  const macroTargets = useKetoStore((s) => s.macroTargets)

  return useMemo(() => {
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = toDateKey(d)
      const food: MacroEntry[]  = foodLog.filter((e) => e.date === key)
      const sport: SportEntry[] = sportLog.filter((e) => e.date === key)
      const totals = sumMacros(food)
      const nc = netCarbs(totals.carbsG, totals.fiberG)
      result.push({
        date: key,
        ...totals,
        netCarbsG: nc,
        kcalBurned: sport.reduce((s, e) => s + (e.kcalBurned ?? 0), 0),
        inKetosis: nc <= macroTargets.carbsG,
        rating: rateDayMacros(food, sport, macroTargets),
      })
    }
    return result
  }, [foodLog, sportLog, macroTargets, days])
}

// ─── ALL DAYS DEFICIT SUMMARY ────────────────────────────────────────────────
export function useCalorieSummary() {
  const foodLog   = useKetoStore((s) => s.foodLog)
  const sportLog  = useKetoStore((s) => s.sportLog)
  const profile   = useKetoStore((s) => s.profile)
  const weightLog = useKetoStore((s) => s.weightLog)
  const today     = toDateKey()

  return useMemo(() => {
    // TDEE = echter Gesamtverbrauch (ohne Defizit-Abzug)
    const latestWeight = [...weightLog].sort((a, b) => b.date.localeCompare(a.date))[0]
    const currentWeight = latestWeight?.weightKg ?? profile?.startWeightKg ?? 80
    const tdee = profile ? calculateTDEE(profile, currentWeight) : 2000

    const byDay: Record<string, { food: MacroEntry[]; sport: SportEntry[] }> = {}
    foodLog.forEach((e) => {
      if (!byDay[e.date]) byDay[e.date] = { food: [], sport: [] }
      byDay[e.date].food.push(e)
    })
    sportLog.forEach((e) => {
      if (!byDay[e.date]) byDay[e.date] = { food: [], sport: [] }
      byDay[e.date].sport.push(e)
    })

    let totalDeficit = 0
    let todayDeficit = 0

    Object.entries(byDay).forEach(([date, { food, sport }]) => {
      const totals  = sumMacros(food)
      const burned  = sport.reduce((s, e) => s + (e.kcalBurned ?? 0), 0)
      const netKcal = totals.kcal - burned
      // Echtes Defizit: TDEE (echter Verbrauch) − Netto-Aufnahme (inkl. Sport)
      const deficit = tdee - netKcal
      totalDeficit += deficit
      if (date === today) todayDeficit = deficit
    })

    return { todayDeficit, totalDeficit, tdee }
  }, [foodLog, sportLog, profile, weightLog, today])
}

// ─── FREQUENT RECIPES ─────────────────────────────────────────────────────────
export function useFrequentRecipes(limit = 5) {
  const recipes = useKetoStore((s) => s.recipes)
  return useMemo(
    () =>
      [...recipes]
        .sort((a, b) => b.usageCount - a.usageCount || (b.lastUsed ?? '').localeCompare(a.lastUsed ?? ''))
        .slice(0, limit),
    [recipes, limit]
  )
}
