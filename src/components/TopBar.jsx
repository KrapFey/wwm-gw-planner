import { useRef } from 'react'
import { useStore, useTemporal, doUndo, doRedo } from '../store/useStore.js'
import { downloadStrategy, readStrategyFile } from '../lib/strategyFile.js'
import StrategyMenu from './StrategyMenu.jsx'

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)

export default function TopBar() {
  const name = useStore((s) => s.strategy.meta.name)
  const setStrategyName = useStore((s) => s.setStrategyName)
  const loadStrategy = useStore((s) => s.loadStrategy)
  const getStrategy = () => useStore.getState().strategy

  const pastCount = useTemporal((s) => s.pastStates.length)
  const futureCount = useTemporal((s) => s.futureStates.length)

  const fileRef = useRef(null)

  const onImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      loadStrategy(await readStrategyFile(file))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="topbar">
      <div className="brand">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
          <path d="M12 3.5v17M3.5 12h17" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" />
        </svg>
        GW Planner
      </div>

      <input
        className="strategy-name"
        value={name}
        onChange={(e) => setStrategyName(e.target.value)}
        aria-label="Strategy name"
      />

      <StrategyMenu />

      <div className="divider" />

      <div className="group">
        <button
          className="icon-btn ghost"
          onClick={() => doUndo()}
          disabled={!pastCount}
          title="Undo (Ctrl+Z)"
        >
          <Icon d={<path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />} />
        </button>
        <button
          className="icon-btn ghost"
          onClick={() => doRedo()}
          disabled={!futureCount}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Icon d={<path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />} />
        </button>
      </div>

      <div className="divider tb-tools-div" />
      {/* BattleMap portals its canvas toolbar in here; it flex-grows to fill
          the free space, and drops to its own full-width row on smaller screens */}
      <div className="topbar-tools" id="canvas-toolbar-slot" />

      <span className="hint">Autosaves locally</span>
      <div className="divider" />

      <div className="group">
        <button onClick={() => fileRef.current?.click()}>Import</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImport}
        />
        <button className="primary" onClick={() => downloadStrategy(getStrategy())}>
          <Icon d={<><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>} />
          Export
        </button>
      </div>
    </div>
  )
}
