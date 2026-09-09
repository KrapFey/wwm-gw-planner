import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Stage, Layer, Group, Circle, Line as KLine } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { MAP_W, MAP_H, clampToMap } from '../../lib/mapLayout.js'
import {
  MARKER_KINDS,
  MARKER_KIND_LIST,
  DRAW_COLORS,
  DRAW_WIDTHS,
  SHAPE_TOOLS,
  SHAPE_META,
  BOX_DRAW_TOOLS,
  drawingPolyline,
  reduceCurvedArrow
} from '../../lib/tacticalDefs.js'
import MapImage from './MapImage.jsx'
import FixtureSprite from './FixtureSprite.jsx'
import SquadToken from './SquadToken.jsx'
import Marker from './Marker.jsx'
import MarkerInspector from './MarkerInspector.jsx'
import DrawingShape from './DrawingShape.jsx'
import AnnotationsOverlay from './AnnotationsOverlay.jsx'
import LayoutEditorPanel from './LayoutEditorPanel.jsx'
import PhasesBar from './PhasesBar.jsx'
import { startFrame, frameAt, totalDuration, phaseArrivalTime } from '../../lib/playback.js'
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
import { downloadBoardImage } from '../../lib/strategyFile.js'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

const SHAPE_ICON = {
  rect: IconSquare,
  ellipse: IconCircle,
  triangle: IconTriangle,
  line: IconLine
}

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
  ['Esc', 'Back to select'],
  ['Ctrl 0', 'Reset zoom']
]

export default function BattleMap() {
  const wrapRef = useRef(null)
  const stageRef = useRef(null)
  const inited = useRef(false)
  const draftRef = useRef(null)
  const erasingRef = useRef(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [editLayout, setEditLayout] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState(null)

  // tool: 'select' | 'pen' | 'arrow' | 'erase' | 'rect' | 'ellipse' | 'triangle' | 'line'
  const [tool, setToolRaw] = useState('select')
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0])
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1].value)
  const [draft, setDraft] = useState(null)
  const [markerPalette, setMarkerPalette] = useState(false)
  const [shapePalette, setShapePalette] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [clearMenu, setClearMenu] = useState(false)
  const [selMarker, setSelMarker] = useState(null)
  const [selDrawing, setSelDrawing] = useState(null)
  const [toolbarSlot, setToolbarSlot] = useState(null)

  // the canvas toolbar renders up in the top bar
  useEffect(() => {
    setToolbarSlot(document.getElementById('canvas-toolbar-slot'))
  }, [])

  const isShapeTool = SHAPE_TOOLS.includes(tool)

  const setTool = (t) => {
    setToolRaw(t)
    if (t !== 'select') {
      setMarkerPalette(false)
      setShapePalette(false)
      setSelMarker(null)
      setSelDrawing(null)
    }
  }

  const selectMarker = (id) => {
    setSelMarker(id)
    setSelDrawing(null)
  }
  const selectDrawing = (id) => {
    setSelDrawing(id)
    setSelMarker(null)
  }

  const squads = useStore((s) => s.strategy.squads)
  const markers = useStore((s) => s.strategy.markers)
  const drawings = useStore((s) => s.strategy.drawings)
  const phases = useStore((s) => s.strategy.phases)
  const fixtures = useStore((s) => s.layout.fixtures)
  const stratName = useStore((s) => s.strategy.meta.name)
  const view = useStore((s) => s.view)
  const pb = useStore((s) => s.playback)
  const setView = useStore((s) => s.setView)
  const setPlayback = useStore((s) => s.setPlayback)
  const selectPhase = useStore((s) => s.selectPhase)
  const updatePhaseSquad = useStore((s) => s.updatePhaseSquad)
  const updatePhaseMarker = useStore((s) => s.updatePhaseMarker)
  const togglePhaseHidden = useStore((s) => s.togglePhaseHidden)
  const setSquadToken = useStore((s) => s.setSquadToken)
  const clearTokens = useStore((s) => s.clearTokens)
  const addMarker = useStore((s) => s.addMarker)
  const updateMarker = useStore((s) => s.updateMarker)
  const removeMarker = useStore((s) => s.removeMarker)
  const clearMarkers = useStore((s) => s.clearMarkers)
  const addDrawing = useStore((s) => s.addDrawing)
  const removeDrawing = useStore((s) => s.removeDrawing)
  const clearDrawings = useStore((s) => s.clearDrawings)
  const addNote = useStore((s) => s.addNote)
  const addTimer = useStore((s) => s.addTimer)

  const placedSquads = squads
    .filter((q) => q.token)
    .sort((a, b) => (a.token.at || 0) - (b.token.at || 0))
  const boardCount = placedSquads.length
  const interactive = tool === 'select' && !editLayout && !pb.playing

  // Resolve each phase's assigned drawn paths into polylines the pills follow.
  const pathPolys = useMemo(() => {
    if (!pb.open || !phases.length) return null
    const byId = Object.fromEntries(drawings.map((d) => [d.id, d]))
    const res = {}
    for (const p of phases) {
      const m = {}
      for (const [sid, did] of Object.entries(p.paths || {})) {
        const poly = drawingPolyline(byId[did])
        if (poly) m[sid] = poly
      }
      if (Object.keys(m).length) res[p.id] = m
    }
    return Object.keys(res).length ? res : null
  }, [pb.open, phases, drawings])

  // Phase-animation frame: the interpolated board while the phase editor is
  // open (null otherwise). Also gates which board a drag writes to.
  const sf = pb.open && phases.length ? startFrame(placedSquads, markers) : null
  const frame = sf ? frameAt(sf, phases, pb.t, pathPolys) : null
  const scrubbing = frame && (pb.playing || pb.t > 0)
  // motion trail: each squad's position at the start of the phase now animating
  // (previous keyframe, or the live Start frame) -> a dashed line to where it is.
  const trailFrom = scrubbing
    ? frame.phaseIndex > 0
      ? frameAt(sf, phases, phaseArrivalTime(phases, frame.phaseIndex - 1), pathPolys).squads
      : sf.squads
    : null
  const editingPhase = pb.open && pb.phaseId ? pb.phaseId : null

  const onSquadMoved = (id, pos) =>
    editingPhase ? updatePhaseSquad(editingPhase, id, pos) : setSquadToken(id, pos)
  const onMarkerMoved = (id, pos) =>
    editingPhase ? updatePhaseMarker(editingPhase, id, pos) : updateMarker(id, pos)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function fit(next = size) {
    if (next.w < 2 || next.h < 2) return
    const scale = Math.min(next.w / MAP_W, next.h / MAP_H) * 0.96
    setView({
      zoom: scale,
      x: (next.w - MAP_W * scale) / 2,
      y: (next.h - MAP_H * scale) / 2
    })
  }

  useEffect(() => {
    if (!inited.current && size.w > 2 && size.h > 2) {
      inited.current = true
      fit(size)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  // Keyboard: tool shortcuts + delete selected + escape.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        zoomTo(1)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()

      // phase-editor transport
      const pbNow = useStore.getState().playback
      if (pbNow.open) {
        const phs = useStore.getState().strategy.phases
        const idx = phs.findIndex((p) => p.id === pbNow.phaseId)
        if (k === ' ' || k === 'spacebar') {
          e.preventDefault()
          setPlayback(
            pbNow.playing
              ? { playing: false }
              : { playing: true, t: pbNow.t >= totalDuration(phs) ? 0 : pbNow.t }
          )
          return
        }
        if (k === 'arrowright') {
          e.preventDefault()
          selectPhase(phs[idx < 0 ? 0 : Math.min(phs.length - 1, idx + 1)]?.id ?? null)
          return
        }
        if (k === 'arrowleft') {
          e.preventDefault()
          selectPhase(idx <= 0 ? null : phs[idx - 1].id)
          return
        }
        if (k === 'home') {
          e.preventDefault()
          selectPhase(null)
          return
        }
      }
      if (k === 'escape') {
        setTool('select')
        setSelMarker(null)
        setSelDrawing(null)
        setMarkerPalette(false)
        setShapePalette(false)
        setShortcutsOpen(false)
        setClearMenu(false)
        return
      }
      if (k === 'delete' || k === 'backspace') {
        // Editing a phase -> Delete hides from *this* phase (non-destructive);
        // otherwise it removes the entity from the whole document.
        const p = useStore.getState().playback
        const ep = p.open && p.phaseId ? p.phaseId : null
        if (selMarker) {
          e.preventDefault()
          if (ep) togglePhaseHidden(ep, 'markers', selMarker)
          else removeMarker(selMarker)
          setSelMarker(null)
        } else if (selDrawing) {
          e.preventDefault()
          if (ep) togglePhaseHidden(ep, 'drawings', selDrawing)
          else removeDrawing(selDrawing)
          setSelDrawing(null)
        }
        return
      }
      if (editLayout) return
      if (k === 'v') setTool('select')
      else if (k === 'd') setTool('pen')
      else if (k === 'a') setTool('arrow')
      else if (k === 'g') setTool('carrow')
      else if (k === 'e') setTool('erase')
      else if (k === 'r') setTool('rect')
      else if (k === 'c') setTool('ellipse')
      else if (k === 't') setTool('triangle')
      else if (k === 'l') setTool('line')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMarker, selDrawing, editLayout])

  // Phase playback clock — advances playback.t while playing.
  useEffect(() => {
    if (!pb.playing) return
    const total = totalDuration(phases)
    let raf
    let last = performance.now()
    const tick = (now) => {
      const st = useStore.getState()
      if (!st.playback.playing) return
      const next = st.playback.t + (now - last) * (st.playback.speed || 1)
      last = now
      if (next >= total) {
        if (st.playback.loop) setPlayback({ t: 0 })
        else return setPlayback({ t: total, playing: false })
      } else {
        setPlayback({ t: next })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pb.playing, phases])

  function zoomTo(newScale) {
    const oldScale = view.zoom
    const s = clamp(newScale, MIN_ZOOM, MAX_ZOOM)
    const cx = size.w / 2
    const cy = size.h / 2
    const mx = (cx - view.x) / oldScale
    const my = (cy - view.y) / oldScale
    setView({ zoom: s, x: cx - mx * s, y: cy - my * s })
  }
  const zoomBy = (factor) => zoomTo(view.zoom * factor)

  function onWheel(e) {
    e.evt.preventDefault()
    const stage = stageRef.current
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const mx = (pointer.x - stage.x()) / oldScale
    const my = (pointer.y - stage.y()) / oldScale
    const dir = e.evt.deltaY > 0 ? 1 / 1.09 : 1.09
    const newScale = clamp(oldScale * dir, MIN_ZOOM, MAX_ZOOM)
    setView({ zoom: newScale, x: pointer.x - mx * newScale, y: pointer.y - my * newScale })
  }

  function onStageDragEnd(e) {
    if (e.target === e.target.getStage()) {
      setView({ x: e.target.x(), y: e.target.y() })
    }
  }

  function pointerLogical() {
    const stage = stageRef.current
    const p = stage?.getPointerPosition()
    if (!p) return null
    return { x: (p.x - view.x) / view.zoom, y: (p.y - view.y) / view.zoom }
  }

  function eraseAtPointer() {
    const stage = stageRef.current
    const pos = stage?.getPointerPosition()
    if (!pos) return
    const hit = stage.getIntersection(pos)
    if (hit && hit.name() === 'drawing') removeDrawing(hit.id())
  }

  function onPointerDown(e) {
    if (editLayout) {
      if (e.target === e.target.getStage()) setSelectedFixture(null)
      return
    }
    if (tool === 'select') {
      // click on empty canvas clears any selection
      if (e.target === e.target.getStage()) {
        setSelMarker(null)
        setSelDrawing(null)
      }
      return
    }
    if (tool === 'erase') {
      erasingRef.current = true
      eraseAtPointer()
      window.addEventListener('pointerup', onPointerUp, { once: true })
      return
    }
    const p = pointerLogical()
    if (!p) return
    draftRef.current = { tool, color: drawColor, width: drawWidth, points: [p.x, p.y] }
    setDraft({ ...draftRef.current })
    // finalise even if the pointer is released outside the stage
    window.addEventListener('pointerup', onPointerUp, { once: true })
  }

  function onPointerMove() {
    if (erasingRef.current) {
      eraseAtPointer()
      return
    }
    const d = draftRef.current
    if (!d) return
    const p = pointerLogical()
    if (!p) return
    if (BOX_DRAW_TOOLS.includes(d.tool)) {
      // arrow + shapes: geometry is just the start + current corner
      d.points = [d.points[0], d.points[1], p.x, p.y]
    } else {
      const lx = d.points[d.points.length - 2]
      const ly = d.points[d.points.length - 1]
      if (Math.hypot(p.x - lx, p.y - ly) > 2) d.points.push(p.x, p.y)
    }
    setDraft({ ...d, points: [...d.points] })
  }

  function onPointerUp() {
    erasingRef.current = false
    const d = draftRef.current
    draftRef.current = null
    if (d) {
      if (d.tool === 'carrow') {
        // drawn like the pen (an arc); reduce to start / apex / end
        const n = d.points.length
        const span = Math.hypot(d.points[n - 2] - d.points[0], d.points[n - 1] - d.points[1])
        if (n >= 6 && span > 6) addDrawing({ ...d, points: reduceCurvedArrow(d.points) })
      } else {
        const enough = BOX_DRAW_TOOLS.includes(d.tool)
          ? d.points.length >= 4 &&
            Math.hypot(d.points[2] - d.points[0], d.points[3] - d.points[1]) > 6
          : d.points.length >= 6
        if (enough) addDrawing(d)
      }
    }
    setDraft(null)
  }

  function clientToLogical(clientX, clientY) {
    const rect = stageRef.current.container().getBoundingClientRect()
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom
    }
  }

  function onDrop(e) {
    e.preventDefault()
    const squadId = e.dataTransfer.getData('application/x-gw-squad')
    if (squadId) {
      setSquadToken(squadId, clampToMap(clientToLogical(e.clientX, e.clientY)))
    }
  }

  function centerLogical() {
    return clampToMap({
      x: (size.w / 2 - view.x) / view.zoom,
      y: (size.h / 2 - view.y) / view.zoom
    })
  }

  function toggleEditLayout() {
    setEditLayout((v) => !v)
    setSelectedFixture(null)
    setTool('select')
    setDraft(null)
    draftRef.current = null
    if (pb.open) setPlayback({ open: false, playing: false, phaseId: null, t: 0 })
  }

  function togglePhases() {
    if (pb.open) {
      setPlayback({ open: false, playing: false, phaseId: null, t: 0 })
    } else {
      setEditLayout(false)
      setTool('select')
      setSelMarker(null)
      setSelDrawing(null)
      setPlayback({ open: true, phaseId: null, playing: false, t: 0 })
    }
  }

  return (
    <div className="map">
      {toolbarSlot &&
        createPortal(
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
                        <span
                          className="mk-dot"
                          style={{ background: MARKER_KINDS[k].color }}
                        />
                        {MARKER_KINDS[k].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="dock-btn"
                onClick={() => addNote(centerLogical())}
                title="Add note"
              >
                <IconNote />
              </button>
              <button
                className="dock-btn"
                onClick={() => addTimer(centerLogical())}
                title="Add timer"
              >
                <IconClock />
              </button>
            </div>

            <span className="ctb-div" />

            <div className="ctb-group">
              <button
                className={'dock-btn' + (pb.open ? ' on' : '')}
                onClick={togglePhases}
                title="Plan phases (animation)"
              >
                <IconTimeline />
              </button>
              <button
                className="dock-btn"
                onClick={toggleEditLayout}
                title="Edit map layout"
              >
                <IconLayers />
              </button>
            </div>

          </>
        )}

        {!editLayout &&
          (boardCount > 0 || markers.length > 0 || drawings.length > 0) && (
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
                    {markers.length > 0 && (
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
                    {drawings.length > 0 && (
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
            {Math.round(view.zoom * 100)}%
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
            <button
              className="dock-btn"
              onClick={() =>
                downloadBoardImage(stageRef.current, stratName, { width: MAP_W, height: MAP_H })
              }
              title="Export the board as a PNG"
            >
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
          </div>,
          toolbarSlot
        )}

      <div
        className={
          'stage-wrap' +
          (pb.open ? ' phases-open' : '') +
          (editLayout
            ? ''
            : tool === 'erase'
              ? ' erasing'
              : tool !== 'select'
                ? ' drawing'
                : '')
        }
        ref={wrapRef}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {size.w > 0 && size.h > 0 && (
          <Stage
            ref={stageRef}
            width={size.w}
            height={size.h}
            scaleX={view.zoom}
            scaleY={view.zoom}
            x={view.x}
            y={view.y}
            draggable={tool === 'select' && !pb.playing}
            onWheel={onWheel}
            onDragEnd={onStageDragEnd}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <Layer listening={false}>
              <MapImage />
            </Layer>

            <Layer>
              {fixtures.map((f) => (
                <FixtureSprite
                  key={f.id}
                  fixture={f}
                  editable={editLayout}
                  playDraggable={interactive}
                  selected={f.id === selectedFixture}
                  onSelect={setSelectedFixture}
                />
              ))}
            </Layer>

            <Layer listening={interactive || tool === 'erase'}>
              {drawings.map((d) =>
                frame?.hiddenDrawings?.has(d.id) ? null : (
                  <DrawingShape
                    key={d.id}
                    drawing={d}
                    selected={interactive && d.id === selDrawing}
                    onSelect={selectDrawing}
                  />
                )
              )}
              {draft && <DrawingShape drawing={{ ...draft, id: 'draft' }} live />}
            </Layer>

            {trailFrom && (
              <Layer listening={false}>
                {placedSquads.map((q) => {
                  if (frame.hiddenSquads?.has(q.id)) return null
                  const cur = frame.squads[q.id]
                  const from = trailFrom[q.id]
                  if (!cur || !from) return null
                  if (Math.hypot(cur.x - from.x, cur.y - from.y) < 4) return null
                  return (
                    <Group key={q.id}>
                      <KLine
                        points={[from.x, from.y, cur.x, cur.y]}
                        stroke={q.color}
                        strokeWidth={4}
                        opacity={0.9}
                        lineCap="round"
                        dash={[10, 7]}
                        shadowColor={q.color}
                        shadowBlur={6}
                        shadowOpacity={0.5}
                      />
                      <Circle
                        x={from.x}
                        y={from.y}
                        radius={11}
                        fill={q.color}
                        opacity={0.45}
                        stroke="#0c0e12"
                        strokeWidth={1.5}
                      />
                    </Group>
                  )
                })}
              </Layer>
            )}

            <Layer
              listening={interactive}
              opacity={editLayout ? 0.35 : 1}
            >
              {placedSquads.map((q) =>
                frame?.hiddenSquads?.has(q.id) ? null : (
                  <SquadToken
                    key={q.id}
                    squad={q}
                    override={frame?.squads[q.id]}
                    onMove={pb.open ? (pos) => onSquadMoved(q.id, pos) : undefined}
                    onRemove={
                      editingPhase
                        ? () => togglePhaseHidden(editingPhase, 'squads', q.id)
                        : undefined
                    }
                    locked={pb.playing}
                  />
                )
              )}
            </Layer>

            {/* markers sit above team pills so a fresh/moved marker is never
                hidden under one; the last item in `markers` draws on top */}
            <Layer listening={interactive}>
              {markers.map((m) =>
                frame?.hiddenMarkers?.has(m.id) ? null : (
                  <Marker
                    key={m.id}
                    marker={m}
                    selected={m.id === selMarker}
                    onSelect={selectMarker}
                    override={frame?.markers[m.id]}
                    onMove={pb.open ? (pos) => onMarkerMoved(m.id, pos) : undefined}
                    onRemove={
                      editingPhase
                        ? () => togglePhaseHidden(editingPhase, 'markers', m.id)
                        : undefined
                    }
                    locked={pb.playing}
                  />
                )
              )}
            </Layer>
          </Stage>
        )}

        {!editLayout && (
          <AnnotationsOverlay view={view} hiddenNotes={frame?.hiddenNotes} />
        )}

        {!editLayout && selMarker && markers.some((m) => m.id === selMarker) && (
          <MarkerInspector
            marker={markers.find((m) => m.id === selMarker)}
            onClose={() => setSelMarker(null)}
          />
        )}

        {editLayout && (
          <LayoutEditorPanel
            selectedId={selectedFixture}
            onSelect={setSelectedFixture}
            onDone={toggleEditLayout}
          />
        )}

        {pb.open && <PhasesBar />}
      </div>
    </div>
  )
}
