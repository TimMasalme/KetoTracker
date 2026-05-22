import { ExternalLink, X, Download } from 'lucide-react'
import type { UpdateInfo } from '@/hooks/useUpdateChecker'
import { useKetoStore } from '@/store'
import { t } from '@/i18n'

interface Props {
  info: UpdateInfo
  onDismiss: () => void
}

export default function UpdateDialog({ info, onDismiss }: Props) {
  const lang = useKetoStore((s) => s.lang)
  const tr = t[lang]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-title"
        className="fixed z-[70] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[90vw] max-w-sm
                   bg-white rounded-2xl shadow-2xl
                   border border-cream-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-accent-green/10">
              <Download size={18} className="text-accent-green" />
            </span>
            <div>
              <h2
                id="update-title"
                className="font-display text-base font-semibold text-charcoal-900"
              >
                {tr.updateAvailable}
              </h2>
              <p className="text-xs text-cream-400">{info.version}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-cream-400 hover:text-charcoal-900 transition-colors mt-0.5"
            aria-label={tr.close}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2">
          <p className="text-sm text-charcoal-700 leading-relaxed">
            {tr.updateMessage.replace('{version}', info.version)}
          </p>

          {info.releaseNotes && (
            <div className="mt-3 p-3 rounded-xl bg-cream-100 text-xs text-charcoal-600 leading-relaxed whitespace-pre-line line-clamp-6">
              {info.releaseNotes}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium
                       bg-cream-100 text-charcoal-700 hover:bg-cream-200 transition-colors"
          >
            {tr.updateLater}
          </button>
          <a
            href={info.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDismiss}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium
                       bg-charcoal-900 text-cream-50 hover:bg-charcoal-800 transition-colors"
          >
            {tr.updateNow}
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </>
  )
}
