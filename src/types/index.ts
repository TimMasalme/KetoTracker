// ─── USER PROFILE ─────────────────────────────────────────────────────────────
export interface UserProfile {
  name: string
  birthDate: string           // ISO date string
  heightCm: number
  startWeightKg: number
  goalWeightKg: number
  neckCm: number
  waistCm: number
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active'
  goal: 'weightloss' | 'maintenance' | 'muscle'
  ketosisTarget: boolean
  gender: 'male' | 'female'
}

// ─── MACROS ───────────────────────────────────────────────────────────────────
export interface MacroTargets {
  kcal: number
  fatG: number
  proteinG: number
  carbsG: number            // net carbs, keto default ≤ 20g
  fiberG: number
}

export interface MacroEntry {
  id: string
  date: string              // YYYY-MM-DD
  time: string              // HH:mm
  name: string              // meal or food name
  kcal: number
  fatG: number
  proteinG: number
  carbsG: number
  fiberG: number
  recipeId?: string         // linked saved recipe
  notes?: string
}

// ─── RECIPES ──────────────────────────────────────────────────────────────────
export interface Ingredient {
  name: string
  amount: number            // e.g. 30 — always in g or ml
  unit: 'g' | 'ml'
  kcalPer100: number
  fatPer100: number
  proteinPer100: number
  carbsPer100: number
  fiberPer100: number
}

export interface Recipe {
  id: string
  name: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
  servings: number          // base servings
  kcalPerServing: number
  fatGPerServing: number
  proteinGPerServing: number
  carbsGPerServing: number
  fiberGPerServing: number
  ingredients: Ingredient[] | string[]  // structured (new) or free-text (legacy)
  instructions?: string
  usageCount: number        // tracks frequency
  lastUsed?: string         // ISO date
  tags: string[]            // e.g. ['lazy keto', 'meal prep']
  isFavorite: boolean
}

// ─── WEIGHT LOG ───────────────────────────────────────────────────────────────
export interface WeightEntry {
  id: string
  date: string
  weightKg: number
  waistCm?: number
  neckCm?: number
  notes?: string
}

// ─── FASTING ──────────────────────────────────────────────────────────────────
export type FastingProtocol = '16:8' | '18:6' | '20:4' | '24h' | 'custom'

export interface FastingSession {
  id: string
  startTime: string         // ISO timestamp — timer is computed from real OS clock vs this
  endTime?: string          // ISO timestamp, undefined if ongoing
  targetHours: number
  protocol: FastingProtocol
  completed: boolean
  notes?: string
}

// ─── SPORT / ACTIVITY ────────────────────────────────────────────────────────
export type SportCategory =
  | 'strength'
  | 'cardio'
  | 'hiit'
  | 'yoga'
  | 'cycling'
  | 'swimming'
  | 'walking'
  | 'other'

export interface SportEntry {
  id: string
  date: string
  time: string
  name: string
  category: SportCategory
  durationMin: number
  kcalBurned?: number
  notes?: string
}

// ─── DAILY LOG (aggregated) ────────────────────────────────────────────────
export interface DayRating {
  date: string
  totalKcal: number
  totalFatG: number
  totalProteinG: number
  totalCarbsG: number
  totalFiberG: number
  kcalBurned: number
  fastingHours: number
  inKetosis: boolean        // carbs <= 20g net
  rating: 'excellent' | 'good' | 'okay' | 'bad'
}

// ─── APP STATE ────────────────────────────────────────────────────────────────
export type ActiveTab = 'dashboard' | 'macros' | 'fasting' | 'calendar' | 'sport' | 'weight' | 'recipes' | 'export' | 'settings' | 'support' | 'ketochecker'
