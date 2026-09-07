import { useEffect } from 'react'
import TopBar from './components/TopBar.jsx'
import RosterPanel from './components/roster/RosterPanel.jsx'
import BattleMap from './components/map/BattleMap.jsx'
import { useStore, doUndo, doRedo } from './store/useStore.js'
import { downloadStrategy } from './lib/strategyFile.js'

export default function App() {
  const panels = useStore((s) => s.ui?.panels) ?? { ally: true, enemy: true }
  const togglePanel = useStore((s) => s.togglePanel)

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
            onClick={() => togglePanel('ally')}
            title={panels.ally ? 'Hide our roster' : 'Show our roster'}
          >
            {panels.ally ? '‹' : '›'}
          </button>
          <button
            className="roster-edge right"
            onClick={() => togglePanel('enemy')}
            title={panels.enemy ? 'Hide enemy roster' : 'Show enemy roster'}
          >
            {panels.enemy ? '›' : '‹'}
          </button>
          <BattleMap />
        </div>

        <RosterPanel sideId="enemy" />
      </div>
    </div>
  )
}
