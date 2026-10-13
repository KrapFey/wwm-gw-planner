import { useStore } from '../../store/useStore.js'
import { DRAW_COLORS, DRAW_WIDTHS, DRAW_TOOL_LABEL } from '../../lib/tacticalDefs.js'
import { squadLabel } from '../../lib/selectors.js'
import { withUndo } from '../../lib/toast.js'
import {
  IconCopy,
  IconTrash,
  IconX,
  IconEdit,
  IconChevronDown,
  IconSendBack,
  IconBringForward
} from '../Icons.jsx'

// Floating bar for the selected team pill, note, timer or drawing (markers
// have their own inspector). Surfaces what was keyboard- or double-click-only:
// duplicate (Ctrl+D), layer order ([ / ]), delete (Del), note text editing.
export default function SelectionBar({ item, onSelect, onEditNote }) {
  const strategy = useStore((s) => s.strategy)
  const phaseId = useStore((s) => (s.playback.open ? s.playback.phaseId : null))
  const collapsed = useStore((s) => !!s.ui.collapsedPills[item.id])
  const act = useStore.getState

  const squad = item.type === 'pill' && strategy.squads.find((q) => q.id === item.id)
  const label = squad
    ? squadLabel(strategy, squad)
    : item.type === 'drawing'
      ? DRAW_TOOL_LABEL[item.tool] ?? 'Drawing'
      : item.type === 'note'
        ? 'Note'
        : 'Timer'
  const dot = squad ? squad.color : item.color

  const remove = () => {
    if (phaseId) act().removeFromBoard(item.id) // hides it in this phase only
    else
      withUndo(squad ? `Took ${label} off the map` : `Deleted ${label.toLowerCase()}`, () =>
        act().removeFromBoard(item.id)
      )
    onSelect(null)
  }

  return (
    <div className="selection-bar" role="toolbar" aria-label={`${label} actions`}>
      <span className="sel-label">
        {dot && <span className="mk-dot" style={{ background: dot }} />}
        {label}
      </span>

      {item.type === 'drawing' && (
        <>
          <span className="ctb-div" />
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              className={'swatch' + (item.color === c ? ' on' : '')}
              style={{ background: c }}
              onClick={() => act().updateItem(item.id, { color: c })}
              title="Colour"
              aria-pressed={item.color === c}
            />
          ))}
          <span className="ctb-div" />
          {DRAW_WIDTHS.map((w) => (
            <button
              key={w.value}
              className={'width-btn' + (item.width === w.value ? ' on' : '')}
              onClick={() => act().updateItem(item.id, { width: w.value })}
              title={`Line width ${w.label}`}
              aria-pressed={item.width === w.value}
            >
              <span style={{ height: Math.max(2, w.value / 2) }} />
            </button>
          ))}
        </>
      )}

      <span className="ctb-div" />

      {item.type === 'note' && (
        <button className="tiny ghost" onClick={() => onEditNote(item.id)} title="Edit text (double-click)">
          <IconEdit /> Edit text
        </button>
      )}
      {item.type === 'pill' && (
        <button
          className="tiny ghost"
          onClick={() => act().togglePillCollapsed(item.id)}
          title="Show as a full pill or a small disc (middle-click)"
        >
          <IconChevronDown /> {collapsed ? 'Expand' : 'Collapse'}
        </button>
      )}
      {item.type !== 'pill' && (
        <button
          className="tiny ghost"
          onClick={() => onSelect(act().duplicateItem(item.id))}
          title="Duplicate (Ctrl+D)"
        >
          <IconCopy /> Duplicate
        </button>
      )}
      <button className="tiny ghost" onClick={() => act().moveItem(item.id, -1)} title="Send back ([)">
        <IconSendBack />
      </button>
      <button className="tiny ghost" onClick={() => act().moveItem(item.id, 1)} title="Bring forward (])">
        <IconBringForward />
      </button>
      <button
        className="tiny ghost danger"
        onClick={remove}
        title={phaseId ? 'Hide in this phase (Del)' : 'Delete (Del)'}
      >
        <IconTrash /> {phaseId ? 'Hide in phase' : item.type === 'pill' ? 'Take off map' : 'Delete'}
      </button>
      <button className="tiny ghost" onClick={() => onSelect(null)} title="Deselect (Esc)">
        <IconX />
      </button>
    </div>
  )
}
