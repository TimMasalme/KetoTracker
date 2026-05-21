import { useKetoStore } from '@/store'
import { useNotifications } from '@/notifications/useNotifications'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/components/dashboard/Dashboard'
import MacrosPage from '@/components/macros/MacrosPage'
import FastingPage from '@/components/fasting/FastingPage'
import CalendarPage from '@/components/calendar/CalendarPage'
import SportPage from '@/components/sport/SportPage'
import WeightPage from '@/components/weight/WeightPage'
import RecipesPage from '@/components/recipes/RecipesPage'
import ExportPage from '@/components/export/ExportPage'
import SettingsPage from '@/components/settings/SettingsPage'
import LangPicker from '@/components/onboarding/LangPicker'
import SupportPage from '@/components/support/SupportPage'

export default function App() {
  useNotifications()
  const langChosen = useKetoStore((s) => s.langChosen)
  const activeTab    = useKetoStore((s) => s.activeTab)
  const profile      = useKetoStore((s) => s.profile)
  const setActiveTab = useKetoStore((s) => s.setActiveTab)

  // First-time user: force settings page so they fill in their profile
  const tab = !profile && activeTab !== 'settings' ? 'settings' : activeTab

  // If we're redirecting, update the store tab so the nav highlights correctly
  if (!profile && activeTab !== 'settings') {
    setActiveTab('settings')
  }

  if (!langChosen) return <LangPicker />

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    macros:    <MacrosPage />,
    fasting:   <FastingPage />,
    calendar:  <CalendarPage />,
    sport:     <SportPage />,
    weight:    <WeightPage />,
    recipes:   <RecipesPage />,
    export:    <ExportPage />,
    settings:  <SettingsPage />,
    support:   <SupportPage />,
  }

  return (
    <Layout>
      <div className="fade-up">
        {pages[tab] ?? <Dashboard />}
      </div>
    </Layout>
  )
}
