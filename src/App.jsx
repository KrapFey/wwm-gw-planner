import { useEffect } from 'react'
import TopBar from './components/TopBar.jsx'
import RosterPanel from './components/roster/RosterPanel.jsx'
import BattleMap from './components/map/BattleMap.jsx'
import UpdateToast from './components/UpdateToast.jsx'
import { useStore, doUndo, doRedo } from './store/useStore.js'
import { downloadStrategy } from './lib/strategyFile.js'

// keep in step with the drawer breakpoint in global.css
const drawerMode = () => window.matchMedia('(max-width: 1180px)').matches

export default function App() {
  const panels = useStore((s) => s.ui?.panels) ?? { ally: true, enemy: true }
  const togglePanel = useStore((s) => s.togglePanel)

  // Rosters are overlay drawers on narrow screens: open the map first, and
  // only ever one drawer at a time.
  useEffect(() => {
    if (!drawerMode()) return
    const p = useStore.getState().ui.panels
    if (p.ally) togglePanel('ally')
    if (p.enemy) togglePanel('enemy')
  }, [togglePanel])
  const toggleDrawer = (side) => {
    const other = side === 'ally' ? 'enemy' : 'ally'
    if (!panels[side] && panels[other] && drawerMode()) togglePanel(other)
    togglePanel(side)
  }

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
      <TopBar />
      <div
        className={
          'workspace' +
          (panels.ally ? '' : ' hide-left') +
          (panels.enemy ? '' : ' hide-right')
        }
      >
        <RosterPanel sideId="ally" />

        <div className="map-pane">
          <button
            className="roster-edge left"
            onClick={() => toggleDrawer('ally')}
            title={panels.ally ? 'Hide our roster' : 'Show our roster'}
          >
            {panels.ally ? '‹' : '›'}
          </button>
          <button
            className="roster-edge right"
            onClick={() => toggleDrawer('enemy')}
            title={panels.enemy ? 'Hide enemy roster' : 'Show enemy roster'}
          >
            {panels.enemy ? '›' : '‹'}
          </button>
          <BattleMap />
        </div>

        <RosterPanel sideId="enemy" />
      </div>
      <UpdateToast />
    </div>
  )
}
