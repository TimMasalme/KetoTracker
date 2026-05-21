import { useKetoStore } from '@/store'

export default function LangPicker() {
  const setLang      = useKetoStore((s) => s.setLang)
  const setLangChosen = useKetoStore((s) => s.setLangChosen)

  function choose(lang: 'de' | 'en') {
    setLang(lang)
    setLangChosen(true)
  }

  return (
    <div className="fixed inset-0 bg-cream-100 flex flex-col items-center justify-center px-6 z-50">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-semibold text-charcoal-900">
          Keto<span className="text-accent-green">Track</span>
        </h1>
        <p className="text-cream-400 text-sm mt-2">Choose your language · Sprache wählen</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => choose('en')}
          className="w-full flex items-center gap-4 bg-white border-2 border-cream-200 hover:border-accent-green hover:bg-green-50/30 rounded-2xl px-5 py-4 transition-all group"
        >
          <span className="text-3xl">🇬🇧</span>
          <div className="text-left">
            <p className="font-semibold text-charcoal-900 group-hover:text-accent-green transition-colors">English</p>
            <p className="text-xs text-cream-400">Continue in English</p>
          </div>
        </button>

        <button
          onClick={() => choose('de')}
          className="w-full flex items-center gap-4 bg-white border-2 border-cream-200 hover:border-accent-green hover:bg-green-50/30 rounded-2xl px-5 py-4 transition-all group"
        >
          <span className="text-3xl">🇩🇪</span>
          <div className="text-left">
            <p className="font-semibold text-charcoal-900 group-hover:text-accent-green transition-colors">Deutsch</p>
            <p className="text-xs text-cream-400">Auf Deutsch fortfahren</p>
          </div>
        </button>
      </div>

      <p className="text-xs text-cream-300 mt-10">
        You can change this anytime in Settings · Jederzeit in Einstellungen änderbar
      </p>
    </div>
  )
}
