import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  UserProfile, MacroTargets, MacroEntry, Recipe,
  WeightEntry, FastingSession, SportEntry, ActiveTab,
} from '@/types'
import { calculateMacroTargets } from '@/utils/calculations'
import type { Lang } from '@/i18n'
import type { NotificationPrefs } from '@/notifications/useNotifications'

const defaultNotifPrefs: NotificationPrefs = {
  mealReminder: false,
  mealReminderLunch: '12:00',
  mealReminderDinner: '19:00',
  fastingReminder: false,
  fastingWarnMinutes: 30,
  weightReminder: false,
  weightReminderTime: '08:00',
  lang: 'en',
}

interface KetoStore {
  notifPrefs: NotificationPrefs
  setNotifPrefs: (prefs: Partial<NotificationPrefs>) => void
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void

  bottomNavIds: ActiveTab[]
  setBottomNavIds: (ids: ActiveTab[]) => void

  lang: Lang
  setLang: (lang: Lang) => void

  langChosen: boolean
  setLangChosen: (v: boolean) => void

  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void

  macroTargets: MacroTargets
  setMacroTargets: (t: MacroTargets) => void
  recalculateTargets: () => void

  foodLog: MacroEntry[]
  addFoodEntry: (entry: Omit<MacroEntry, 'id'>) => void
  updateFoodEntry: (id: string, updates: Partial<Omit<MacroEntry, 'id'>>) => void
  removeFoodEntry: (id: string) => void

  recipes: Recipe[]
  addRecipe: (recipe: Omit<Recipe, 'id' | 'usageCount'>) => void
  updateRecipe: (id: string, updates: Partial<Recipe>) => void
  removeRecipe: (id: string) => void
  logRecipeUse: (recipeId: string, date: string) => MacroEntry

  weightLog: WeightEntry[]
  addWeightEntry: (entry: Omit<WeightEntry, 'id'>) => void
  removeWeightEntry: (id: string) => void

  fastingSessions: FastingSession[]
  activeFasting: FastingSession | null
  startFasting: (protocol: FastingSession['protocol'], targetHours: number) => void
  stopFasting: (notes?: string) => void
  removeFastingSession: (id: string) => void
  updateFastingSession: (id: string, updates: Partial<FastingSession>) => void

  sportLog: SportEntry[]
  addSportEntry: (entry: Omit<SportEntry, 'id'>) => void
  updateSportEntry: (id: string, updates: Partial<Omit<SportEntry, 'id'>>) => void
  removeSportEntry: (id: string) => void
}

const defaultTargets: MacroTargets = {
  kcal: 1700, fatG: 130, proteinG: 110, carbsG: 20, fiberG: 25,
}

const uid = () => Math.random().toString(36).slice(2, 10)

export const useKetoStore = create<KetoStore>()(
  persist(
    (set, get) => ({
      notifPrefs: defaultNotifPrefs,
      setNotifPrefs: (prefs) =>
        set((s) => ({ notifPrefs: { ...s.notifPrefs, ...prefs } })),

      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      bottomNavIds: ['dashboard', 'macros', 'fasting', 'ketochecker'],
      setBottomNavIds: (ids) => set({ bottomNavIds: ids }),

      lang: 'en',
      setLang: (lang) => set({ lang }),

      langChosen: false,
      setLangChosen: (v) => set({ langChosen: v }),

      profile: null,
      setProfile: (profile) => { set({ profile }); get().recalculateTargets() },

      macroTargets: defaultTargets,
      setMacroTargets: (t) => set({ macroTargets: t }),
      recalculateTargets: () => {
        const { profile } = get()
        if (!profile) return
        set({ macroTargets: calculateMacroTargets(profile) })
      },

      foodLog: [],
      addFoodEntry: (entry) =>
        set((s) => ({ foodLog: [...s.foodLog, { ...entry, id: uid() }] })),
      updateFoodEntry: (id, updates) =>
        set((s) => ({ foodLog: s.foodLog.map((e) => e.id === id ? { ...e, ...updates } : e) })),
      removeFoodEntry: (id) =>
        set((s) => ({ foodLog: s.foodLog.filter((e) => e.id !== id) })),

      recipes: [],
      addRecipe: (recipe) =>
        set((s) => ({ recipes: [...s.recipes, { ...recipe, id: uid(), usageCount: 0 }] })),
      updateRecipe: (id, updates) =>
        set((s) => ({ recipes: s.recipes.map((r) => r.id === id ? { ...r, ...updates } : r) })),
      removeRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),
      logRecipeUse: (recipeId, date) => {
        const recipe = get().recipes.find((r) => r.id === recipeId)
        if (!recipe) throw new Error('Recipe not found')
        get().updateRecipe(recipeId, { usageCount: recipe.usageCount + 1, lastUsed: date })
        const entry: MacroEntry = {
          id: uid(), date, time: new Date().toTimeString().slice(0, 5),
          name: recipe.name, kcal: recipe.kcalPerServing, fatG: recipe.fatGPerServing,
          proteinG: recipe.proteinGPerServing, carbsG: recipe.carbsGPerServing,
          fiberG: recipe.fiberGPerServing, recipeId,
        }
        set((s) => ({ foodLog: [...s.foodLog, entry] }))
        return entry
      },

      weightLog: [],
      addWeightEntry: (entry) =>
        set((s) => ({ weightLog: [...s.weightLog, { ...entry, id: uid() }] })),
      removeWeightEntry: (id) =>
        set((s) => ({ weightLog: s.weightLog.filter((e) => e.id !== id) })),

      fastingSessions: [],
      activeFasting: null,
      startFasting: (protocol, targetHours) => {
        const session: FastingSession = {
          id: uid(), startTime: new Date().toISOString(),
          targetHours, protocol, completed: false,
        }
        set({ activeFasting: session })
      },
      stopFasting: (notes) => {
        const { activeFasting } = get()
        if (!activeFasting) return
        const completed: FastingSession = {
          ...activeFasting, endTime: new Date().toISOString(), completed: true, notes,
        }
        set((s) => ({ fastingSessions: [...s.fastingSessions, completed], activeFasting: null }))
      },
      removeFastingSession: (id) =>
        set((s) => ({ fastingSessions: s.fastingSessions.filter((f) => f.id !== id) })),
      updateFastingSession: (id, updates) =>
        set((s) => ({ fastingSessions: s.fastingSessions.map((f) => f.id === id ? { ...f, ...updates } : f) })),

      sportLog: [],
      addSportEntry: (entry) =>
        set((s) => ({ sportLog: [...s.sportLog, { ...entry, id: uid() }] })),
      updateSportEntry: (id, updates) =>
        set((s) => ({ sportLog: s.sportLog.map((e) => e.id === id ? { ...e, ...updates } : e) })),
      removeSportEntry: (id) =>
        set((s) => ({ sportLog: s.sportLog.filter((e) => e.id !== id) })),
    }),
    { name: 'keto-tracker-store' }
  )
)
