import { useEffect } from 'react'
import {
  MARKER_KINDS,
  MARKER_KIND_LIST,
  DRAW_COLORS,
  DRAW_WIDTHS,
  SHAPE_TOOLS,
  SHAPE_META
} from '../../lib/tacticalDefs.js'
import {
  IconCursor,
  IconPencil,
  IconArrow,
  IconArrowCurve,
  IconEraser,
  IconTarget,
  IconNote,
  IconClock,
  IconLayers,
  IconTimeline,
  IconPlus,
  IconMinus,
  IconFit,
  IconShapes,
  IconSquare,
  IconCircle,
  IconTriangle,
  IconLine,
  IconHelp,
  IconTrash,
  IconImage
} from '../Icons.jsx'

const SHAPE_ICON = {
  rect: IconSquare,
  ellipse: IconCircle,
  triangle: IconTriangle,
  line: IconLine
}

// Single-key tool shortcuts: BattleMap's keydown handler and the cheat-sheet
// below both read this, so they can't drift apart.
export const TOOL_KEYS = {
  v: ['select', 'Select / pan'],
  d: ['pen', 'Freehand draw'],
  a: ['arrow', 'Arrow'],
  g: ['carrow', 'Curved arrow'],
  r: ['rect', 'Rectangle'],
  c: ['ellipse', 'Ellipse'],
  t: ['triangle', 'Triangle'],
  l: ['line', 'Line'],
  e: ['erase', 'Eraser']
}
const KEY_OF = Object.fromEntries(
  Object.entries(TOOL_KEYS).map(([k, [t]]) => [t, k.toUpperCase()])
)

const SHORTCUTS = [
  ...Object.entries(TOOL_KEYS).map(([k, [, label]]) => [k.toUpperCase(), label]),
  ['Del', 'Delete selection'],
  ['Ctrl D', 'Duplicate selection'],
  ['[ / ]', 'Send back / bring forward'],
  ['Esc', 'Back to select'],
  ['Ctrl 0', 'Reset zoom']
]

const CLEARABLE = [
  ['pill', 'Clear teams', 'Remove all team markers from the map?'],
  ['marker', 'Clear markers'],
  ['drawing', 'Clear drawings']
]

// draw-group slots, top to bottom; the shapes menu button is slot 4
const TOOL_SLOTS = ['select', 'pen', 'arrow', 'carrow', null, 'erase']

// The map's tool chrome, laid over the canvas: a vertical tool rail (left),
// a line-style strip while a drawing tool is active, and a view dock (zoom,
// PNG export, shortcuts; top right). Purely presentational — every action
// comes in as a prop.
export default function CanvasToolbar({
  editLayout,
  tool,
  setTool,
  isShapeTool,
  menu, // which dropdown is open: 'shape' | 'marker' | 'clear' | 'keys' | null
  setMenu,
  phasesOpen,
  counts, // { pill, marker, drawing } — what "Clear" can remove
  drawColor,
  setDrawColor,
  drawWidth,
  setDrawWidth,
  zoomPct,
  onAdd, // (type, extra) — marker / note / timer at the view centre
  onClear, // (type)
  togglePhases,
  toggleEditLayout,
  zoomBy,
  zoomTo,
  fit,
  onExportPng
}) {
  const toggle = (m) => setMenu((v) => (v === m ? null : m))
  // a click anywhere outside the open dropdown (map included) closes it
  useEffect(() => {
    if (!menu) return
    const onDown = (e) => {
      if (!e.target.closest?.('.ctb-menu')) setMenu(null)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [menu, setMenu])
  // the brass pill behind the active tool slides to this slot
  const slot = isShapeTool ? 4 : TOOL_SLOTS.indexOf(tool)
  const toolBtn = (t, Icon, label) => (
    <button
      className={'dock-btn' + (tool === t ? ' on' : '')}
      onClick={() => setTool(t)}
      title={`${label} (${KEY_OF[t]})`}
      aria-pressed={tool === t}
    >
      <Icon />
    </button>
  )
  const clearable = CLEARABLE.filter(([t]) => counts[t] > 0)

  return (
    <>
      {!editLayout && (
        <nav className="tool-rail" aria-label="Map tools">
          <div className="ctb-group ctb-tools" style={{ '--slot': slot }}>
            <span className="ctb-indicator" aria-hidden="true" hidden={slot < 0} />
            {toolBtn('select', IconCursor, 'Select / pan')}
            {toolBtn('pen', IconPencil, 'Freehand draw')}
            {toolBtn('arrow', IconArrow, 'Arrow')}
            {toolBtn('carrow', IconArrowCurve, 'Curved arrow')}
            <div className="ctb-menu">
              <button
                className={'dock-btn' + (isShapeTool ? ' on' : '') + (menu === 'shape' ? ' open' : '')}
                onClick={() => toggle('shape')}
                title="Shapes"
                aria-expanded={menu === 'shape'}
              >
                <IconShapes />
              </button>
              {menu === 'shape' && (
                <div className="ctb-drop">
                  {SHAPE_TOOLS.map((s) => {
                    const Icon = SHAPE_ICON[s]
                    return (
                      <button
                        key={s}
                        className={'ctb-drop-item' + (tool === s ? ' on' : '')}
                        onClick={() => {
                          setTool(s)
                          setMenu(null)
                        }}
                      >
                        <Icon />
                        {SHAPE_META[s].label}
                        <kbd>{KEY_OF[s]}</kbd>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {toolBtn('erase', IconEraser, 'Eraser — click or drag over lines')}
          </div>

          <div className="ctb-group">
            <div className="ctb-menu">
              <button
                className={'dock-btn' + (menu === 'marker' ? ' open' : '')}
                onClick={() => toggle('marker')}
                title="Objective markers"
                aria-expanded={menu === 'marker'}
              >
                <IconTarget />
              </button>
              {menu === 'marker' && (
                <div className="ctb-drop">
                  {MARKER_KIND_LIST.map((k) => (
                    <button
                      key={k}
                      className="ctb-drop-item"
                      onClick={() => {
                        onAdd('marker', { kind: k })
                        setMenu(null)
                      }}
                    >
                      <span className="mk-dot" style={{ background: MARKER_KINDS[k].color }} />
                      {MARKER_KINDS[k].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="dock-btn" onClick={() => onAdd('note')} title="Add note">
              <IconNote />
            </button>
            <button className="dock-btn" onClick={() => onAdd('timer')} title="Add timer">
              <IconClock />
            </button>
          </div>

          <div className="ctb-group">
            <button
              className={'dock-btn' + (phasesOpen ? ' on' : '')}
              onClick={togglePhases}
              title="Plan phases (animation)"
              aria-pressed={phasesOpen}
            >
              <IconTimeline />
            </button>
            <button className="dock-btn" onClick={toggleEditLayout} title="Edit map layout">
              <IconLayers />
            </button>
            {clearable.length > 0 && (
              <div className="ctb-menu">
                <button
                  className={'dock-btn danger' + (menu === 'clear' ? ' open' : '')}
                  onClick={() => toggle('clear')}
                  title="Clear items"
                  aria-expanded={menu === 'clear'}
                >
                  <IconTrash />
                </button>
                {menu === 'clear' && (
                  <div className="ctb-drop">
                    {clearable.map(([t, label, ask]) => (
                      <button
                        key={t}
                        className="ctb-drop-item"
                        onClick={() => {
                          if (!ask || confirm(ask)) onClear(t)
                          setMenu(null)
                        }}
                      >
                        {label}
                        <span className="count-badge">{counts[t]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      )}

      {!editLayout && (tool === 'pen' || tool === 'arrow' || isShapeTool) && (
        <div className="draw-opts" role="group" aria-label="Line style">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              className={'swatch' + (drawColor === c ? ' on' : '')}
              style={{ background: c }}
              onClick={() => setDrawColor(c)}
              title="Colour"
              aria-pressed={drawColor === c}
            />
          ))}
          <span className="ctb-div" />
          {DRAW_WIDTHS.map((w) => (
            <button
              key={w.value}
              className={'width-btn' + (drawWidth === w.value ? ' on' : '')}
              onClick={() => setDrawWidth(w.value)}
              title={`Line width ${w.label}`}
              aria-pressed={drawWidth === w.value}
            >
              <span style={{ height: Math.max(2, w.value / 2) }} />
            </button>
          ))}
        </div>
      )}

      <div className="view-dock" role="group" aria-label="View">
        <button className="dock-btn" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">
          <IconMinus />
        </button>
        <button className="zoom-val" onClick={() => zoomTo(1)} title="Reset zoom (Ctrl+0)">
          {zoomPct}%
        </button>
        <button className="dock-btn" onClick={() => zoomBy(1.2)} title="Zoom in">
          <IconPlus />
        </button>
        <button className="dock-btn" onClick={() => fit()} title="Fit to screen">
          <IconFit />
        </button>
        {!editLayout && (
          <>
            <span className="ctb-div" />
            <button className="dock-btn" onClick={onExportPng} title="Export the board as a PNG">
              <IconImage />
            </button>
            <div className="ctb-menu">
              <button
                className={'dock-btn' + (menu === 'keys' ? ' open' : '')}
                onClick={() => toggle('keys')}
                title="Keyboard shortcuts"
                aria-expanded={menu === 'keys'}
              >
                <IconHelp />
              </button>
              {menu === 'keys' && (
                <div className="ctb-drop ctb-drop--right shortcuts-pop">
                  <div className="shortcuts-title">Keyboard shortcuts</div>
                  {SHORTCUTS.map(([key, label]) => (
                    <div className="shortcuts-row" key={key}>
                      <kbd>{key}</kbd>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
