import { useRegisterSW } from 'virtual:pwa-register/react'

// Shown when a newer build has been precached (PWA registerType: 'prompt').
// Reloading here swaps in the new service worker + assets.
export default function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-toast" role="status">
      <span>A new version is ready.</span>
      <button className="tiny primary" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button className="tiny ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  )
}
