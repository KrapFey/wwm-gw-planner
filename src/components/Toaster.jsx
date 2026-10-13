import { useToasts, dismiss, pause, resume } from '../lib/toast.js'
import { IconX, IconWarn, IconCheck } from './Icons.jsx'

// Renders the toast queue (lib/toast.js), top-centre under the top bar so it
// never covers the phases bar or the tool rail.
export default function Toaster() {
  const toasts = useToasts()
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={'toast ' + t.tone}
          onPointerEnter={() => pause(t.id)}
          onPointerLeave={() => resume(t.id)}
          onFocus={() => pause(t.id)}
          onBlur={() => resume(t.id)}
        >
          {t.tone === 'error' ? <IconWarn /> : <IconCheck />}
          <span className="toast-msg">{t.message}</span>
          {t.action && (
            <button
              className="tiny toast-action"
              onClick={() => {
                t.action.run()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="tiny ghost toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <IconX />
          </button>
        </div>
      ))}
    </div>
  )
}
