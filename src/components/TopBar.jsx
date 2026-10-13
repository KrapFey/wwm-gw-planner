import { useEffect, useRef, useState } from 'react'
import { useStore, useTemporal, doUndo, doRedo, subscribeSaved } from '../store/useStore.js'
import { downloadStrategy, readStrategyFile } from '../lib/strategyFile.js'
import { shareUrl } from '../lib/shareLink.js'
import { SIDE_META } from '../lib/schema.js'
import StrategyMenu from './StrategyMenu.jsx'
import {
  IconBanner,
  IconUndo,
  IconRedo,
  IconLink,
  IconCheck,
  IconUpload,
  IconDownload,
  IconPanelLeft,
  IconPanelRight
} from './Icons.jsx'

// panels / onTogglePanel: which roster columns are open (App owns the
// drawer logic); each side's toggle sits at its own end of the bar.
export default function TopBar({ panels, onTogglePanel }) {
  const name = useStore((s) => s.strategy.meta.name)
  const setStrategyName = useStore((s) => s.setStrategyName)
  const loadStrategy = useStore((s) => s.loadStrategy)
  const getStrategy = () => useStore.getState().strategy

  const pastCount = useTemporal((s) => s.pastStates.length)
  const futureCount = useTemporal((s) => s.futureStates.length)

  const fileRef = useRef(null)

  // Flash "Saved ✓" whenever a debounced write actually lands, then fall back
  // to the static hint.
  const [justSaved, setJustSaved] = useState(false)
  const savedTimer = useRef(null)
  useEffect(
    () =>
      subscribeSaved(() => {
        setJustSaved(true)
        clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setJustSaved(false), 1500)
      }),
    []
  )

  const [copied, setCopied] = useState(false)
  const onShare = async () => {
    const url = await shareUrl(getStrategy())
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      prompt('Copy this link to share the strategy:', url)
    }
  }

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
    <header className="topbar">
      <div className="brand" title="Where Winds Meet — Guild War planner">
        <IconBanner />
        <span className="brand-name">GW Planner</span>
      </div>

      <PanelToggle side="ally" label="Our Guild" open={panels.ally} onToggle={onTogglePanel} />

      <div className="doc">
        <input
          className="strategy-name"
          value={name}
          onChange={(e) => setStrategyName(e.target.value)}
          aria-label="Strategy name"
          spellCheck={false}
        />
        <StrategyMenu />
      </div>

      <div className="group history">
        <button
          className="icon-btn ghost"
          onClick={() => doUndo()}
          disabled={!pastCount}
          title="Undo (Ctrl+Z)"
        >
          <IconUndo />
        </button>
        <button
          className="icon-btn ghost"
          onClick={() => doRedo()}
          disabled={!futureCount}
          title="Redo (Ctrl+Shift+Z)"
        >
          <IconRedo />
        </button>
      </div>

      <span className="spacer" />

      <span className={'hint' + (justSaved ? ' saved' : '')} role="status">
        <span className="save-dot" aria-hidden="true" />
        <span className="hint-text">{justSaved ? 'Saved' : 'Autosaves locally'}</span>
      </span>

      <div className="group actions">
        <button
          className={copied ? 'done' : ''}
          onClick={onShare}
          title="Copy a link that opens a copy of this strategy"
        >
          {copied ? <IconCheck /> : <IconLink />}
          <span className="btn-label">{copied ? 'Link copied' : 'Share'}</span>
        </button>
        <button onClick={() => fileRef.current?.click()} title="Open a strategy file">
          <IconUpload />
          <span className="btn-label">Import</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImport}
        />
        <button
          className="primary"
          onClick={() => downloadStrategy(getStrategy())}
          title="Save this strategy as a file (Ctrl+S)"
        >
          <IconDownload />
          <span className="btn-label">Export</span>
        </button>
      </div>

      <PanelToggle side="enemy" label="Enemy" open={panels.enemy} onToggle={onTogglePanel} />
    </header>
  )
}

function PanelToggle({ side, label, open, onToggle }) {
  return (
    <button
      className={'panel-toggle side-' + side + (open ? ' on' : '')}
      style={{ '--side-accent': SIDE_META[side].color }}
      onClick={() => onToggle(side)}
      aria-pressed={open}
      title={(open ? 'Hide ' : 'Show ') + (side === 'ally' ? 'our roster' : 'enemy roster')}
    >
      {side === 'ally' ? <IconPanelLeft /> : <IconPanelRight />}
      <span className="btn-label">{label}</span>
    </button>
  )
}
