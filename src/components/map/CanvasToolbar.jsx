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

// Display list only — the keys are wired in BattleMap's keydown handler.
const SHORTCUTS = [
  ['V', 'Select / pan'],
  ['D', 'Freehand draw'],
  ['A', 'Arrow'],
  ['G', 'Curved arrow'],
  ['R', 'Rectangle'],
  ['C', 'Ellipse'],
  ['T', 'Triangle'],
  ['L', 'Line'],
  ['E', 'Eraser'],
  ['Del', 'Delete selection'],
  ['Ctrl D', 'Duplicate selected drawing'],
  ['[ / ]', 'Drawing back / forward'],
  ['Esc', 'Back to select'],
  ['Ctrl 0', 'Reset zoom']
]

// The single toolbar that lives in the top bar (BattleMap portals it there).
// Purely presentational — every action comes in as a prop.
export default function CanvasToolbar({
  editLayout,
  tool,
  setTool,
  isShapeTool,
  shapePalette,
  setShapePalette,
  markerPalette,
  setMarkerPalette,
  clearMenu,
  setClearMenu,
  shortcutsOpen,
  setShortcutsOpen,
  phasesOpen,
  boardCount,
  markerCount,
  drawingCount,
  drawColor,
  setDrawColor,
  drawWidth,
  setDrawWidth,
  zoomPct,
  addMarker,
  addNote,
  addTimer,
  centerLogical,
  togglePhases,
  toggleEditLayout,
  clearTokens,
  clearMarkers,
  clearDrawings,
  zoomBy,
  zoomTo,
  fit,
  onExportPng
}) {
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
                className={'dock-btn' + (isShapeTool || shapePalette ? ' on' : '')}
                onClick={() => {
                  setShapePalette((v) => !v)
                  setMarkerPalette(false)
                }}
                title="Shapes — rectangle (R), ellipse (C), triangle (T), line (L)"
              >
                <IconShapes />
              </button>
              {shapePalette && (
                <div className="ctb-drop">
                  {SHAPE_TOOLS.map((s) => {
                    const Icon = SHAPE_ICON[s]
                    return (
                      <button
                        key={s}
                        className={'ctb-drop-item' + (tool === s ? ' on' : '')}
                        onClick={() => {
                          setTool(s)
                          setShapePalette(false)
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
                className={'dock-btn' + (markerPalette ? ' on' : '')}
                onClick={() => {
                  setMarkerPalette((v) => !v)
                  setShapePalette(false)
                }}
                title="Objective markers"
              >
                <IconFlag />
              </button>
              {markerPalette && (
                <div className="ctb-drop">
                  {MARKER_KIND_LIST.map((k) => (
                    <button
                      key={k}
                      className="ctb-drop-item"
                      onClick={() => {
                        addMarker(k, centerLogical())
                        setMarkerPalette(false)
                      }}
                    >
                      <span className="mk-dot" style={{ background: MARKER_KINDS[k].color }} />
                      {MARKER_KINDS[k].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="dock-btn" onClick={() => addNote(centerLogical())} title="Add note">
              <IconNote />
            </button>
            <button className="dock-btn" onClick={() => addTimer(centerLogical())} title="Add timer">
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

      {!editLayout && (boardCount > 0 || markerCount > 0 || drawingCount > 0) && (
        <>
          <span className="ctb-div" />
          <div className="ctb-menu">
            <button
              className={'dock-btn' + (clearMenu ? ' on' : '')}
              onClick={() => setClearMenu((v) => !v)}
              title="Clear items"
            >
              <IconTrash />
            </button>
            {clearMenu && (
              <div className="ctb-drop ctb-drop--right">
                {boardCount > 0 && (
                  <button
                    className="ctb-drop-item"
                    onClick={() => {
                      if (confirm('Remove all team markers from the map?')) clearTokens()
                      setClearMenu(false)
                    }}
                  >
                    Clear teams
                  </button>
                )}
                {markerCount > 0 && (
                  <button
                    className="ctb-drop-item"
                    onClick={() => {
                      clearMarkers()
                      setClearMenu(false)
                    }}
                  >
                    Clear markers
                  </button>
                )}
                {drawingCount > 0 && (
                  <button
                    className="ctb-drop-item"
                    onClick={() => {
                      clearDrawings()
                      setClearMenu(false)
                    }}
                  >
                    Clear drawings
                  </button>
                )}
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
              className={'dock-btn' + (shortcutsOpen ? ' on' : '')}
              onClick={() => setShortcutsOpen((v) => !v)}
              title="Keyboard shortcuts"
            >
              <IconHelp />
            </button>
            {shortcutsOpen && (
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
