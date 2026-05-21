import { useKetoStore } from '@/store'
import paypalImg from '../../assets/paypal.png'
import kofiImg from '../../assets/kofi.png'

export default function SupportPage() {
  const lang = useKetoStore((s) => s.lang)
  const de = lang === 'de'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-semibold text-charcoal-900">
          {de ? 'Unterstützung' : 'Support'}
        </h2>
        <p className="text-sm text-cream-400 mt-1">
          {de
            ? 'KetoTrack ist kostenlos und werbefrei. Jede Unterstützung hilft.'
            : 'KetoTrack is free and ad-free. Any support helps.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* PayPal */}
        <a
          href="https://paypal.me/timelmasalme"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border-2 border-cream-200 bg-white hover:border-charcoal-300 hover:shadow-lg active:scale-[0.98] transition-all overflow-hidden"
          style={{ aspectRatio: '3 / 2' }}
        >
          <div className="w-full h-full flex items-center justify-center p-8">
            <img
              src={paypalImg}
              alt="PayPal"
              className="w-full h-full object-contain"
            />
          </div>
        </a>

        {/* Ko-fi */}
        <a
          href="https://ko-fi.com/timmasalme"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border-2 border-cream-200 bg-white hover:border-charcoal-300 hover:shadow-lg active:scale-[0.98] transition-all overflow-hidden"
          style={{ aspectRatio: '3 / 2' }}
        >
          <div className="w-full h-full flex items-center justify-center p-8">
            <img
              src={kofiImg}
              alt="Ko-fi"
              className="w-full h-full object-contain"
            />
          </div>
        </a>
      </div>

      <p className="text-center text-xs text-cream-300 pt-1">— Tim El Masalme</p>
    </div>
  )
}
