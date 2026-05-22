import { useState } from 'react'
import { useKetoStore } from '@/store'
import { t } from '@/i18n'
import { calculateMacroTargets, calculateBodyFatPercent, calculateAge } from '@/utils/calculations'
import { Save, RefreshCw, Bell, Smartphone, LayoutGrid } from 'lucide-react'
import type { UserProfile } from '@/types'
import type { ActiveTab } from '@/types'
import { scheduleReminders } from '@/notifications/useNotifications'
import DeviceLinkModal from '@/sync/DeviceLinkModal'
import { useSyncStore } from '@/sync/useSyncStore'
import { allNavItems } from '@/components/layout/Layout'

const blankProfile: UserProfile = {
  name: '', birthDate: '', heightCm: 0, startWeightKg: 0,
  goalWeightKg: 0, neckCm: 0, waistCm: 0, activityLevel: 'light',
  goal: 'weightloss', ketosisTarget: true, gender: 'male',
}

type FormStr = {
  name: string; birthDate: string; gender: UserProfile['gender']
  activityLevel: UserProfile['activityLevel']; goal: UserProfile['goal']
  heightCm: string; startWeightKg: string; goalWeightKg: string
  waistCm: string; neckCm: string
}

function profileToStr(p: UserProfile): FormStr {
  return {
    name: p.name, birthDate: p.birthDate, gender: p.gender,
    activityLevel: p.activityLevel, goal: p.goal,
    heightCm: p.heightCm ? String(p.heightCm) : '',
    startWeightKg: p.startWeightKg ? String(p.startWeightKg) : '',
    goalWeightKg: p.goalWeightKg ? String(p.goalWeightKg) : '',
    waistCm: p.waistCm ? String(p.waistCm) : '',
    neckCm: p.neckCm ? String(p.neckCm) : '',
  }
}

function strToProfile(f: FormStr): UserProfile {
  return {
    name: f.name, birthDate: f.birthDate, gender: f.gender,
    activityLevel: f.activityLevel, goal: f.goal, ketosisTarget: true,
    heightCm: parseFloat(f.heightCm) || 0,
    startWeightKg: parseFloat(f.startWeightKg) || 0,
    goalWeightKg: parseFloat(f.goalWeightKg) || 0,
    waistCm: parseFloat(f.waistCm) || 0,
    neckCm: parseFloat(f.neckCm) || 0,
  }
}

export default function SettingsPage() {
  const profile         = useKetoStore((s) => s.profile)
  const macroTargets    = useKetoStore((s) => s.macroTargets)
  const setProfile      = useKetoStore((s) => s.setProfile)
  const setMacroTargets = useKetoStore((s) => s.setMacroTargets)
  const recalculate     = useKetoStore((s) => s.recalculateTargets)
  const lang            = useKetoStore((s) => s.lang)
  const tr              = t[lang]

  const [form, setForm] = useState<FormStr>(profileToStr(profile ?? blankProfile))
  const [macros, setMacros] = useState(macroTargets)
  const [saved, setSaved]   = useState(false)
  const [showSync, setShowSync] = useState(false)

  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)

  const notifPrefs    = useKetoStore((s) => s.notifPrefs)
  const setNotifPrefs = useKetoStore((s) => s.setNotifPrefs)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifDenied, setNotifDenied] = useState(false)

  const bottomNavIds    = useKetoStore((s) => s.bottomNavIds)
  const setBottomNavIds = useKetoStore((s) => s.setBottomNavIds)

  const isOnboarding = !profile

  function handleSave() {
    const parsed = strToProfile(form)
    setProfile(parsed)
    setMacroTargets(macros)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const parsedForm = strToProfile(form)
  const bodyFat = parsedForm.waistCm && parsedForm.neckCm && parsedForm.heightCm
    ? calculateBodyFatPercent(
        parsedForm.waistCm,
        parsedForm.neckCm,
        parsedForm.heightCm,
        parsedForm.gender,
      )
    : null

  const suggestedTargets = parsedForm.heightCm > 0 && parsedForm.startWeightKg > 0
    ? calculateMacroTargets(parsedForm, parsedForm.startWeightKg)
    : macroTargets

  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold">
        {isOnboarding ? tr.onboardingTitle : tr.settingsTitle}
      </h2>

      {isOnboarding && (
        <div className="bg-accent-green/10 border border-accent-green/30 rounded-xl p-3 text-sm text-accent-green">
          {tr.onboardingHint}
        </div>
      )}

      {/* Profile */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold">{tr.profileSection}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">{tr.name}</label>
            <input className="input" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.birthDate}</label>
            <input className="input" type="date" value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.gender}</label>
            <select className="input" value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as UserProfile['gender'] })}>
              <option value="male">{tr.genderMale}</option>
              <option value="female">{tr.genderFemale}</option>
            </select>
          </div>
          <div>
            <label className="label">{tr.heightCm}</label>
            <input className="input" type="number" value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.startWeightKg}</label>
            <input className="input" type="number" step="0.1" value={form.startWeightKg}
              onChange={(e) => setForm({ ...form, startWeightKg: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.goalWeightKg}</label>
            <input className="input" type="number" step="0.1" value={form.goalWeightKg}
              onChange={(e) => setForm({ ...form, goalWeightKg: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.waistCm}</label>
            <input className="input" type="number" step="0.5" value={form.waistCm}
              onChange={(e) => setForm({ ...form, waistCm: e.target.value })} />
          </div>
          <div>
            <label className="label">{tr.neckCm}</label>
            <input className="input" type="number" step="0.5" value={form.neckCm}
              onChange={(e) => setForm({ ...form, neckCm: e.target.value })} />
          </div>
        </div>

        {bodyFat !== null && (
          <div className="bg-cream-50 border border-cream-200 rounded-xl p-3 text-sm">
            <p className="text-cream-400 text-xs uppercase tracking-wide mb-1">{tr.calculatedValues}</p>
            <div className="flex gap-4 font-mono">
              <span>{tr.bodyFatLabel}: <strong>{bodyFat}%</strong></span>
              {form.birthDate && <span>{tr.ageLabel}: <strong>{calculateAge(form.birthDate)}</strong></span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{tr.activityLevel}</label>
            <select className="input" value={form.activityLevel}
              onChange={(e) => setForm({ ...form, activityLevel: e.target.value as UserProfile['activityLevel'] })}>
              <option value="sedentary">{tr.activitySedentary}</option>
              <option value="light">{tr.activityLight}</option>
              <option value="moderate">{tr.activityModerate}</option>
              <option value="active">{tr.activityActive}</option>
            </select>
          </div>
          <div>
            <label className="label">{tr.goal}</label>
            <select className="input" value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value as UserProfile['goal'] })}>
              <option value="weightloss">{tr.goalWeightloss}</option>
              <option value="maintenance">{tr.goalMaintenance}</option>
              <option value="muscle">{tr.goalMuscle}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Macro targets */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{tr.macroTargetsSection}</h3>
          <button
            onClick={() => { recalculate(); setMacros(suggestedTargets) }}
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={12} />
            {tr.autoCalculate}
          </button>
        </div>
        <p className="text-xs text-cream-400">
          {tr.recommendedFor}: {suggestedTargets.kcal} kcal · F {suggestedTargets.fatG}g · P {suggestedTargets.proteinG}g · C {suggestedTargets.carbsG}g
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['kcal',     tr.labelKcal],
            ['fatG',     tr.labelFatG],
            ['proteinG', tr.labelProteinG],
            ['carbsG',   tr.labelCarbsG],
            ['fiberG',   tr.labelFiberG],
          ] as [keyof typeof macros, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" type="number"
                value={macros[key] === 0 ? '' : macros[key]}
                onChange={(e) => setMacros({ ...macros, [key]: parseFloat(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
      </div>


      {/* Notifications */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-accent-green" />
          <h3 className="text-sm font-semibold">{tr.notifSection}</h3>
        </div>

        {notifDenied && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
            {tr.notifPermDenied}
          </div>
        )}

        {/* Meal reminder */}
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <div>
              <p className="text-sm font-medium">{tr.notifMealReminder}</p>
              <p className="text-xs text-cream-400">{tr.notifMealReminderDesc}</p>
            </div>
            <button
              onClick={() => setNotifPrefs({ mealReminder: !notifPrefs.mealReminder })}
              className={`w-11 h-6 rounded-full transition-colors relative ${notifPrefs.mealReminder ? 'bg-accent-green' : 'bg-cream-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPrefs.mealReminder ? 'translate-x-5' : ''}`} />
            </button>
          </label>
          {notifPrefs.mealReminder && (
            <div className="grid grid-cols-2 gap-2 pl-2">
              <div>
                <label className="label">{tr.notifMealLunch}</label>
                <input className="input" type="time" value={notifPrefs.mealReminderLunch}
                  onChange={(e) => setNotifPrefs({ mealReminderLunch: e.target.value })} />
              </div>
              <div>
                <label className="label">{tr.notifMealDinner}</label>
                <input className="input" type="time" value={notifPrefs.mealReminderDinner}
                  onChange={(e) => setNotifPrefs({ mealReminderDinner: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        {/* Fasting reminder */}
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <div>
              <p className="text-sm font-medium">{tr.notifFastingReminder}</p>
              <p className="text-xs text-cream-400">{tr.notifFastingReminderDesc}</p>
            </div>
            <button
              onClick={() => setNotifPrefs({ fastingReminder: !notifPrefs.fastingReminder })}
              className={`w-11 h-6 rounded-full transition-colors relative ${notifPrefs.fastingReminder ? 'bg-accent-green' : 'bg-cream-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPrefs.fastingReminder ? 'translate-x-5' : ''}`} />
            </button>
          </label>
          {notifPrefs.fastingReminder && (
            <div className="pl-2">
              <label className="label">{tr.notifFastingWarnMin}</label>
              <input className="input w-28" type="number" min={5} max={120} step={5}
                value={notifPrefs.fastingWarnMinutes}
                onChange={(e) => setNotifPrefs({ fastingWarnMinutes: parseInt(e.target.value) || 30 })} />
            </div>
          )}
        </div>

        {/* Weight reminder */}
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <div>
              <p className="text-sm font-medium">{tr.notifWeightReminder}</p>
              <p className="text-xs text-cream-400">{tr.notifWeightReminderDesc}</p>
            </div>
            <button
              onClick={() => setNotifPrefs({ weightReminder: !notifPrefs.weightReminder })}
              className={`w-11 h-6 rounded-full transition-colors relative ${notifPrefs.weightReminder ? 'bg-accent-green' : 'bg-cream-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPrefs.weightReminder ? 'translate-x-5' : ''}`} />
            </button>
          </label>
          {notifPrefs.weightReminder && (
            <div className="pl-2">
              <label className="label">{tr.notifWeightTime}</label>
              <input className="input w-28" type="time" value={notifPrefs.weightReminderTime}
                onChange={(e) => setNotifPrefs({ weightReminderTime: e.target.value })} />
            </div>
          )}
        </div>

        {/* Save reminders button */}
        <button
          onClick={async () => {
            setNotifDenied(false)
            try {
              const today = new Date().toISOString().slice(0, 10)
              const foodLog = useKetoStore.getState().foodLog
              const weightLog = useKetoStore.getState().weightLog
              const activeFasting = useKetoStore.getState().activeFasting
              const hasMealToday = foodLog.some((e) => e.date === today)
              const hasWeightToday = weightLog.some((e) => e.date === today)
              let fastingEndTime: Date | null = null
              if (activeFasting) {
                const start = new Date(activeFasting.startTime)
                fastingEndTime = new Date(start.getTime() + activeFasting.targetHours * 3_600_000)
              }
              await scheduleReminders(
                { ...notifPrefs, lang },
                { hasMealToday, fastingEndTime, hasWeightToday }
              )
              setNotifSaved(true)
              setTimeout(() => setNotifSaved(false), 2000)
            } catch {
              setNotifDenied(true)
            }
          }}
          className={`btn-primary w-full flex items-center justify-center gap-2 ${notifSaved ? '!bg-accent-green' : ''}`}
        >
          <Bell size={16} />
          {notifSaved ? tr.notifSaveOk : tr.save + ' ' + tr.notifSection}
        </button>
      </div>

      {/* ── Bottom Navigation customization ──────────────────────── */}
      <div className="card space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-accent-green" />
          <h3 className="text-sm font-semibold">
            {lang === 'de' ? 'Navigation anpassen' : 'Customize Navigation'}
          </h3>
        </div>
        <p className="text-xs text-cream-400">
          {lang === 'de'
            ? 'Wähle bis zu 4 Tabs, die in der unteren Leiste erscheinen.'
            : 'Choose up to 4 tabs to show in the bottom bar.'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {allNavItems.map((item) => {
            const isSelected = bottomNavIds.includes(item.id as ActiveTab)
            const selectedIndex = bottomNavIds.indexOf(item.id as ActiveTab)
            const isAtLimit = bottomNavIds.length >= 4 && !isSelected

            function toggleItem() {
              if (isSelected) {
                // Always allow deselect
                setBottomNavIds(bottomNavIds.filter((id) => id !== item.id))
              } else if (!isAtLimit) {
                setBottomNavIds([...bottomNavIds, item.id as ActiveTab])
              }
            }

            return (
              <button
                key={item.id}
                onClick={toggleItem}
                disabled={isAtLimit}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium
                  transition-all text-left
                  ${isSelected
                    ? 'border-charcoal-900 bg-charcoal-900 text-cream-50'
                    : isAtLimit
                      ? 'border-cream-200 bg-cream-50 text-cream-300 cursor-not-allowed'
                      : 'border-cream-200 bg-white text-charcoal-800 hover:bg-cream-100'
                  }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate flex-1">{tr[item.labelKey] as string}</span>
                {isSelected && (
                  <span className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-cream-50/20 text-[10px] font-bold">
                    {selectedIndex + 1}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-cream-400 text-center">
          {lang === 'de'
            ? `${bottomNavIds.length}/4 ausgewählt`
            : `${bottomNavIds.length}/4 selected`}
        </p>
      </div>

      {/* Save */}
      <button onClick={handleSave} className={`btn-primary w-full flex items-center justify-center gap-2
        ${saved ? '!bg-accent-green' : ''}`}>
        <Save size={16} />
        {saved ? tr.savedOk : isOnboarding ? tr.createProfile : tr.save}
      </button>

      {/* Device Sync */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-accent-green" />
          <h3 className="text-sm font-semibold">{tr.linkDevicesTitle}</h3>
        </div>
        {lastSyncedAt && (
          <p className="text-xs text-cream-400">
            {tr.lastSynced}: {new Date(lastSyncedAt).toLocaleTimeString()}
          </p>
        )}
        <button
          onClick={() => setShowSync(true)}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
        >
          <Smartphone size={15} />
          {tr.linkDevicesBtn}
        </button>
      </div>

      {showSync && <DeviceLinkModal onClose={() => setShowSync(false)} />}

      <p className="text-center text-xs text-cream-400">
        KetoTrack {tr.version} · {tr.footerLocal}
      </p>
    </div>
  )
}
