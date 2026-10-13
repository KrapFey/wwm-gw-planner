import { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { FIXTURE_KINDS, FIXTURE_KIND_LIST } from '../../lib/mapLayout.js'

export default function LayoutEditorPanel({ selectedId, onSelect, onDone }) {
  const fixtures = useStore((s) => s.layout.fixtures)
  const addFixture = useStore((s) => s.addFixture)
  const updateFixture = useStore((s) => s.updateFixture)
  const removeFixture = useStore((s) => s.removeFixture)
  const resetLayout = useStore((s) => s.resetLayout)

  const [kind, setKind] = useState('tower_blue')
  const [copied, setCopied] = useState(false)

  const json = JSON.stringify(fixtures, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('Clipboard blocked — use Download instead.')
    }
  }

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'map-layout.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="layout-panel">
      <header>
        <strong>Edit map layout</strong>
        <button className="tiny primary close" onClick={onDone}>
          Done
        </button>
      </header>
      <span className="panel-hint">Drag fixtures on the map to place them.</span>

      <div className="add-row">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {FIXTURE_KIND_LIST.map((k) => (
            <option key={k} value={k}>
              {FIXTURE_KINDS[k].label}
            </option>
          ))}
        </select>
        <button className="tiny" onClick={() => addFixture(kind)}>
          + Add
        </button>
      </div>

      <ul className="fixture-list">
        {fixtures.map((f) => (
          <li
            key={f.id}
            className={f.id === selectedId ? 'sel' : ''}
            onClick={() => onSelect(f.id)}
          >
            <span className="fx-name">{FIXTURE_KINDS[f.kind]?.label ?? f.kind}</span>
            <span className="muted fx-xy">
              {f.x},{f.y}
            </span>
            {f.id === selectedId && (
              <div className="fx-controls" onClick={(e) => e.stopPropagation()}>
                <label>
                  size
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.05"
                    value={f.scale ?? 1}
                    style={{ '--p': ((f.scale ?? 1) - 0.3) / 2.7 }}
                    onChange={(e) => updateFixture(f.id, { scale: Number(e.target.value) })}
                  />
                  <span className="mono">{(f.scale ?? 1).toFixed(2)}</span>
                </label>
                <label>
                  rot
                  <input
                    type="number"
                    step="5"
                    value={f.rotation ?? 0}
                    onChange={(e) =>
                      updateFixture(f.id, { rotation: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <button className="tiny ghost" onClick={() => removeFixture(f.id)}>
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <footer>
        <button className="tiny primary" onClick={copy}>
          {copied ? 'Copied' : 'Copy layout JSON'}
        </button>
        <button className="tiny" onClick={download}>
          Download
        </button>
        <button
          className="tiny ghost"
          onClick={() => {
            if (confirm('Reset all fixtures to the shipped preset?')) resetLayout()
          }}
        >
          Reset
        </button>
      </footer>
      <p className="muted panel-hint">
        Placement autosaves in this browser. Send the copied JSON to bake it in as
        the default for everyone.
      </p>
    </div>
  )
}
