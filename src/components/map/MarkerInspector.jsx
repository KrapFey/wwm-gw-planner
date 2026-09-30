import { useStore } from '../../store/useStore.js'
import { MARKER_KINDS } from '../../lib/tacticalDefs.js'

export default function MarkerInspector({ marker, onClose }) {
  const updateMarker = useStore((s) => s.updateItem)
  const removeMarker = useStore((s) => s.removeItem)
  const def = MARKER_KINDS[marker.kind] ?? MARKER_KINDS.attack

  return (
    <div className="inspector">
      <header>
        <span
          className="mk-dot"
          style={{ background: def.color, width: 11, height: 11 }}
        />
        <strong>{def.label} marker</strong>
        <button className="tiny ghost" style={{ marginLeft: 'auto' }} onClick={onClose}>
          ✕
        </button>
      </header>

      <label>
        Label
        <input
          value={marker.label ?? ''}
          placeholder={def.label}
          onChange={(e) => updateMarker(marker.id, { label: e.target.value })}
        />
      </label>

      <label>
        Size
        <input
          type="range"
          min="0.6"
          max="2.6"
          step="0.05"
          value={marker.scale ?? 1}
          onChange={(e) => updateMarker(marker.id, { scale: Number(e.target.value) })}
        />
        <span className="mono">{(marker.scale ?? 1).toFixed(2)}</span>
      </label>

      <label>
        Rotate
        <input
          type="range"
          min="0"
          max="360"
          step="5"
          value={marker.rotation ?? 0}
          onChange={(e) => updateMarker(marker.id, { rotation: Number(e.target.value) })}
        />
        <span className="mono">{Math.round(marker.rotation ?? 0)}°</span>
      </label>

      <footer>
        <button
          className="tiny ghost"
          onClick={() => updateMarker(marker.id, { rotation: 0, scale: 1, label: '' })}
        >
          Reset
        </button>
        <button
          className="tiny ghost"
          onClick={() => {
            removeMarker(marker.id)
            onClose()
          }}
        >
          Delete
        </button>
      </footer>
    </div>
  )
}
