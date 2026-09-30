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
  IconFlag,
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

const SHORTCUTS = [
  ...Object.entries(TOOL_KEYS).map(([k, [, label]]) => [k.toUpperCase(), label]),
  ['Del', 'Delete selection'],
  ['Ctrl D', 'Duplicate selection'],
  ['[ / ]', 'Send back / bring forward'],
  ['Esc', 'Back to select'],
  ['Ctrl 0', 'Reset zoom']
]

// The single toolbar that lives in the top bar (BattleMap portals it there).
// Purely presentational — every action comes in as a prop.
const CLEARABLE = [
  ['pill', 'Clear teams', 'Remove all team markers from the map?'],
  ['marker', 'Clear markers'],
  ['drawing', 'Clear drawings']
]

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
  return (
    <div className="canvas-toolbar">
      {!editLayout && (
        <>
          <div className="ctb-group">
            <button
              className={'dock-btn' + (tool === 'select' ? ' on' : '')}
              onClick={() => setTool('select')}
              title="Select / pan (V)"
            >
              <IconCursor />
            </button>
            <button
              className={'dock-btn' + (tool === 'pen' ? ' on' : '')}
              onClick={() => setTool('pen')}
              title="Freehand draw (D)"
            >
              <IconPencil />
            </button>
            <button
              className={'dock-btn' + (tool === 'arrow' ? ' on' : '')}
              onClick={() => setTool('arrow')}
              title="Arrow (A)"
            >
              <IconArrow />
            </button>
            <button
              className={'dock-btn' + (tool === 'carrow' ? ' on' : '')}
              onClick={() => setTool('carrow')}
              title="Curved arrow (G)"
            >
              <IconArrowCurve />
            </button>
            <div className="ctb-menu">
              <button
                className={'dock-btn' + (isShapeTool || menu === 'shape' ? ' on' : '')}
                onClick={() => toggle('shape')}
                title="Shapes — rectangle (R), ellipse (C), triangle (T), line (L)"
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
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <button
              className={'dock-btn' + (tool === 'erase' ? ' on' : '')}
              onClick={() => setTool('erase')}
              title="Eraser — click or drag over lines to delete (E)"
            >
              <IconEraser />
            </button>
          </div>

          <span className="ctb-div" />

          <div className="ctb-group">
            <div className="ctb-menu">
              <button
                className={'dock-btn' + (menu === 'marker' ? ' on' : '')}
                onClick={() => toggle('marker')}
                title="Objective markers"
              >
                <IconFlag />
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

          <span className="ctb-div" />

          <div className="ctb-group">
            <button
              className={'dock-btn' + (phasesOpen ? ' on' : '')}
              onClick={togglePhases}
              title="Plan phases (animation)"
            >
              <IconTimeline />
            </button>
            <button className="dock-btn" onClick={toggleEditLayout} title="Edit map layout">
              <IconLayers />
            </button>
          </div>
        </>
      )}

      {!editLayout && CLEARABLE.some(([t]) => counts[t] > 0) && (
        <>
          <span className="ctb-div" />
          <div className="ctb-menu">
            <button
              className={'dock-btn' + (menu === 'clear' ? ' on' : '')}
              onClick={() => toggle('clear')}
              title="Clear items"
            >
              <IconTrash />
            </button>
            {menu === 'clear' && (
              <div className="ctb-drop ctb-drop--right">
                {CLEARABLE.filter(([t]) => counts[t] > 0).map(([t, label, ask]) => (
                  <button
                    key={t}
                    className="ctb-drop-item"
                    onClick={() => {
                      if (!ask || confirm(ask)) onClear(t)
                      setMenu(null)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <span className="ctb-spacer" />
      {!editLayout && (tool === 'pen' || tool === 'arrow' || isShapeTool) && (
        <div className="ctb-group ctb-draw">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              className={'swatch' + (drawColor === c ? ' on' : '')}
              style={{ background: c }}
              onClick={() => setDrawColor(c)}
              title="Colour"
            />
          ))}
          <span className="ctb-div" />
          {DRAW_WIDTHS.map((w) => (
            <button
              key={w.value}
              className={'tiny' + (drawWidth === w.value ? ' primary' : ' ghost')}
              onClick={() => setDrawWidth(w.value)}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
      <span className="ctb-spacer" />

      <span className="ctb-div" />
      <div className="ctb-group">
        <button className="dock-btn" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">
          <IconMinus />
        </button>
        <button className="zoom-val" onClick={() => zoomTo(1)} title="Reset zoom">
          {zoomPct}%
        </button>
        <button className="dock-btn" onClick={() => zoomBy(1.2)} title="Zoom in">
          <IconPlus />
        </button>
        <button className="dock-btn" onClick={() => fit()} title="Fit to screen">
          <IconFit />
        </button>
      </div>

      {!editLayout && (
        <>
          <span className="ctb-div" />
          <button className="dock-btn" onClick={onExportPng} title="Export the board as a PNG">
            <IconImage />
          </button>
          <div className="ctb-menu">
            <button
              className={'dock-btn' + (menu === 'keys' ? ' on' : '')}
              onClick={() => toggle('keys')}
              title="Keyboard shortcuts"
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
  )
}
