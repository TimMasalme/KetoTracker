import { useState } from 'react'
import { useKetoStore } from '@/store'
import { t } from '@/i18n'
import type { ActiveTab } from '@/types'
import {
  LayoutDashboard, Utensils, Timer, Dumbbell,
  Scale, BookOpen, Settings, CalendarDays, Download,
  MoreHorizontal, X, Heart, ScanBarcode,
} from 'lucide-react'
import { useUpdateChecker } from '@/hooks/useUpdateChecker'
import UpdateDialog from '@/components/update/UpdateDialog'

interface NavItem { id: ActiveTab; labelKey: keyof typeof t['de']; icon: React.ReactNode }

export const allNavItems: NavItem[] = [
  { id: 'dashboard',   labelKey: 'dashboard',   icon: <LayoutDashboard size={20} /> },
  { id: 'macros',      labelKey: 'macros',      icon: <Utensils size={20} /> },
  { id: 'fasting',     labelKey: 'fasting',     icon: <Timer size={20} /> },
  { id: 'ketochecker', labelKey: 'ketoChecker', icon: <ScanBarcode size={20} /> },
  { id: 'calendar',    labelKey: 'calendar',    icon: <CalendarDays size={20} /> },
  { id: 'sport',       labelKey: 'sport',       icon: <Dumbbell size={20} /> },
  { id: 'weight',      labelKey: 'weight',      icon: <Scale size={20} /> },
  { id: 'recipes',     labelKey: 'recipes',     icon: <BookOpen size={20} /> },
  { id: 'export',      labelKey: 'export',      icon: <Download size={20} /> },
  { id: 'settings',    labelKey: 'settings',    icon: <Settings size={20} /> },
  { id: 'support',     labelKey: 'support',     icon: <Heart size={20} /> },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const activeTab    = useKetoStore((s) => s.activeTab)
  const setActiveTab = useKetoStore((s) => s.setActiveTab)
  const lang         = useKetoStore((s) => s.lang)
  const setLang      = useKetoStore((s) => s.setLang)
  const bottomNavIds = useKetoStore((s) => s.bottomNavIds)
  const tr           = t[lang]

  const [drawerOpen, setDrawerOpen] = useState(false)
  const { updateInfo, dismiss } = useUpdateChecker()

  function navigate(id: ActiveTab) {
    setActiveTab(id)
    setDrawerOpen(false)
  }

  // Build primary nav from stored IDs (up to 4)
  const primaryMobileNav = bottomNavIds
    .slice(0, 4)
    .map((id) => allNavItems.find((n) => n.id === id))
    .filter(Boolean) as NavItem[]

  // Secondary = everything NOT in primary
  const secondaryMobileNav = allNavItems.filter(
    (item) => !bottomNavIds.slice(0, 4).includes(item.id)
  )

  const isSecondary = secondaryMobileNav.some((n) => n.id === activeTab)

  return (
    <div className="flex h-dvh overflow-hidden bg-cream-100">
      {/* Sidebar (desktop) */}
      <aside
        className="hidden md:flex flex-col w-56 bg-white border-r border-cream-200 shrink-0 py-6 px-4"
        ref={(el) => { if (el) document.documentElement.style.setProperty('--sidebar-w', el.offsetWidth + 'px') }}
      >
        <div className="mb-6 px-2 flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-charcoal-900">
              Keto<span className="text-accent-green">Track</span>
            </h1>
            <p className="text-xs text-cream-400 mt-0.5">{tr.tagline}</p>
          </div>
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-cream-100 hover:bg-cream-200 transition-colors text-charcoal-800 shrink-0"
            title="Switch language"
          >
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {allNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 text-left w-full
                ${activeTab === item.id
                  ? 'bg-charcoal-900 text-cream-50'
                  : 'text-charcoal-800 hover:bg-cream-100'}`}
            >
              {item.icon}
              {tr[item.labelKey] as string}
            </button>
          ))}
        </nav>
        <div className="text-xs text-cream-400 px-2">{tr.version}</div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar mobile – lang switch */}
        <div className="md:hidden flex justify-end px-4 pt-4">
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-cream-200 hover:bg-cream-100 transition-colors text-charcoal-800 shadow-sm"
            title="Switch language"
          >
            {lang === 'de' ? 'EN' : 'DE'}
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-4 pb-28 md:pb-8">
          {children}
        </div>
      </main>

      {/* ── "Mehr" drawer (mobile) ──────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-white rounded-t-2xl border-t border-cream-200 shadow-xl pb-2">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-cream-100">
              <span className="text-xs font-semibold text-cream-400 uppercase tracking-wide">
                {lang === 'de' ? 'Mehr' : 'More'}
              </span>
              <button onClick={() => setDrawerOpen(false)} className="text-cream-400 hover:text-charcoal-900 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1 px-3 pt-2 pb-1">
              {secondaryMobileNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all
                    ${activeTab === item.id
                      ? 'bg-charcoal-900 text-cream-50'
                      : 'text-charcoal-800 hover:bg-cream-100'}`}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{tr[item.labelKey] as string}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-cream-200 z-50">
        <div className="flex justify-around items-center h-16 px-1">
          {primaryMobileNav.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl
                transition-all duration-150 min-w-0
                ${activeTab === item.id ? 'text-charcoal-900' : 'text-cream-400'}`}
            >
              {item.icon}
              <span className="text-[9px] font-medium truncate max-w-[44px]">
                {tr[item.labelKey] as string}
              </span>
            </button>
          ))}
          {/* "Mehr" / "More" button */}
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl
              transition-all duration-150 min-w-0
              ${isSecondary || drawerOpen ? 'text-charcoal-900' : 'text-cream-400'}`}
          >
            <MoreHorizontal size={20} />
            <span className="text-[9px] font-medium">
              {lang === 'de' ? 'Mehr' : 'More'}
            </span>
          </button>
        </div>
      </nav>
      {/* Update dialog */}
      {updateInfo && <UpdateDialog info={updateInfo} onDismiss={dismiss} />}
    </div>
  )
}
