import { useEffect } from 'react'
import TopBar from './components/TopBar.jsx'
import RosterPanel from './components/roster/RosterPanel.jsx'
import BattleMap from './components/map/BattleMap.jsx'
import UpdateToast from './components/UpdateToast.jsx'
import Tooltip from './components/Tooltip.jsx'
import Toaster from './components/Toaster.jsx'
import { toast, toastError } from './lib/toast.js'
import { useStore, doUndo, doRedo } from './store/useStore.js'
import { downloadStrategy } from './lib/strategyFile.js'
import { decodeShare, shareCodeInUrl } from './lib/shareLink.js'
import { drawerMode, DRAWER_QUERY } from './lib/drawerMode.js'


export default function App() {
  const panels = useStore((s) => s.ui?.panels) ?? { ally: true, enemy: true }
  const togglePanel = useStore((s) => s.togglePanel)

  // Rosters are overlay drawers on narrow screens: open the map first, and
  // only ever one drawer at a time. Applies on load and whenever the window
  // narrows into drawer mode (open columns would otherwise cover the map).
  useEffect(() => {
    const closeDrawers = () => {
      const p = useStore.getState().ui.panels
      if (p.ally) togglePanel('ally')
      if (p.enemy) togglePanel('enemy')
    }
    if (drawerMode()) closeDrawers()
    const mq = window.matchMedia(DRAWER_QUERY)
    const onChange = (e) => e.matches && closeDrawers()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [togglePanel])
  const toggleDrawer = (side) => {
    const other = side === 'ally' ? 'enemy' : 'ally'
    if (!panels[side] && panels[other] && drawerMode()) togglePanel(other)
    togglePanel(side)
  }

  // Opened from a share link (on load, or pasted into an already-open tab,
  // which only changes the hash): import it as a new library entry, then drop
  // the code from the URL so a reload doesn't import it again.
  useEffect(() => {
    const openShared = () => {
      const code = shareCodeInUrl()
      if (!code) return
      history.replaceState(null, '', location.pathname + location.search)
      decodeShare(code).then(
        (doc) => {
          useStore.getState().loadStrategy(doc)
          toast(`Opened shared strategy “${useStore.getState().strategy.meta.name}”`)
        },
        () => toastError('This share link is broken or incomplete. Ask for a fresh link.')
      )
    }
    openShared()
    window.addEventListener('hashchange', openShared)
    return () => window.removeEventListener('hashchange', openShared)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        doUndo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        doRedo()
      } else if (k === 's') {
        e.preventDefault()
        downloadStrategy(useStore.getState().strategy)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <TopBar panels={panels} onTogglePanel={toggleDrawer} />
      <div
        className={
          'workspace' +
          (panels.ally ? '' : ' hide-left') +
          (panels.enemy ? '' : ' hide-right')
        }
      >
        <RosterPanel sideId="ally" />

        <main className="map-pane">
          <BattleMap />
        </main>

        <RosterPanel sideId="enemy" />
      </div>
      <UpdateToast />
      <Tooltip />
      <Toaster />
    </div>
  )
}
