import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Stage, Layer, Group, Circle, Line as KLine } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { MAP_W, MAP_H, clampToMap } from '../../lib/mapLayout.js'
import { DRAW_COLORS, DRAW_WIDTHS, SHAPE_TOOLS, drawingPolyline } from '../../lib/tacticalDefs.js'
import MapImage from './MapImage.jsx'
import FixtureSprite from './FixtureSprite.jsx'
import SquadToken from './SquadToken.jsx'
import Marker from './Marker.jsx'
import MarkerInspector from './MarkerInspector.jsx'
import DrawingShape from './DrawingShape.jsx'
import AnnotationsOverlay from './AnnotationsOverlay.jsx'
import LayoutEditorPanel from './LayoutEditorPanel.jsx'
import PhasesBar from './PhasesBar.jsx'
import CanvasToolbar, { TOOL_KEYS } from './CanvasToolbar.jsx'
import { useCamera } from './useCamera.js'
import { useDrawTool } from './useDrawTool.js'
import { startFrame, frameAt, totalDuration, phaseArrivalTime } from '../../lib/playback.js'
import { downloadBoardImage } from '../../lib/strategyFile.js'

const PB_CLOSED = { open: false, playing: false, phaseId: null, t: 0 }

export default function BattleMap() {
  const wrapRef = useRef(null)
  const stageRef = useRef(null)
  const cam = useCamera(wrapRef, stageRef)
  const [editLayout, setEditLayout] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState(null)

  // tool: 'select' | 'erase' | a drawing tool (pen / arrow / carrow / shapes)
  const [tool, setToolRaw] = useState('select')
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0])
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1].value)
  const [markerPalette, setMarkerPalette] = useState(false)
  const [shapePalette, setShapePalette] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [clearMenu, setClearMenu] = useState(false)
  const [selMarker, setSelMarker] = useState(null)
  const [selDrawing, setSelDrawing] = useState(null)
  const [toolbarSlot, setToolbarSlot] = useState(null)
  const draw = useDrawTool({
    tool,
    color: drawColor,
    width: drawWidth,
    stageRef,
    pointerMap: cam.pointerMap
  })

  // the canvas toolbar renders up in the top bar
  useEffect(() => {
    setToolbarSlot(document.getElementById('canvas-toolbar-slot'))
  }, [])

  const clearSelection = () => {
    setSelMarker(null)
    setSelDrawing(null)
  }
  const setTool = (t) => {
    setToolRaw(t)
    if (t !== 'select') {
      setMarkerPalette(false)
      setShapePalette(false)
      clearSelection()
    }
  }
  const selectMarker = useCallback((id) => {
    setSelMarker(id)
    setSelDrawing(null)
  }, [])
  const selectDrawing = useCallback((id) => {
    setSelDrawing(id)
    setSelMarker(null)
  }, [])

  const squads = useStore((s) => s.strategy.squads)
  const markers = useStore((s) => s.strategy.markers)
  const drawings = useStore((s) => s.strategy.drawings)
  const phases = useStore((s) => s.strategy.phases)
  const fixtures = useStore((s) => s.layout.fixtures)
  const stratName = useStore((s) => s.strategy.meta.name)
  const view = useStore((s) => s.view)
  const pb = useStore((s) => s.playback)
  const showTrail = useStore((s) => s.ui.showTrail)
  const act = useStore.getState // store actions are stable; read at call time

  const placedSquads = useMemo(
    () => squads.filter((q) => q.token).sort((a, b) => (a.token.at || 0) - (b.token.at || 0)),
    [squads]
  )
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
  // open (null otherwise).
  const sf = useMemo(
    () => (pb.open && phases.length ? startFrame(placedSquads, markers) : null),
    [pb.open, phases, placedSquads, markers]
  )
  const frame = useMemo(
    () => (sf ? frameAt(sf, phases, pb.t, pathPolys) : null),
    [sf, phases, pb.t, pathPolys]
  )
  const scrubbing = frame && (pb.playing || pb.t > 0)
  // motion trail: each squad's position at the start of the phase now animating
  // (previous keyframe, or the live Start frame) -> a dashed line to where it is.
  const trailFrom = useMemo(() => {
    if (!scrubbing || !showTrail) return null
    return frame.phaseIndex > 0
      ? frameAt(sf, phases, phaseArrivalTime(phases, frame.phaseIndex - 1), pathPolys).squads
      : sf.squads
  }, [scrubbing, showTrail, sf, phases, pathPolys, frame?.phaseIndex])
  // the phase whose board a pill/marker drag writes to (null = live board)
  const editingPhase = pb.open && pb.phaseId ? pb.phaseId : null

  // Keyboard: tool shortcuts, selection actions, phase transport.
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const mod = e.ctrlKey || e.metaKey
      const k = e.key.toLowerCase()
      const s = useStore.getState()
      if (mod && k === '0') {
        e.preventDefault()
        return cam.zoomTo(1)
      }
      if (mod && k === 'd') {
        if (!selDrawing) return
        e.preventDefault()
        const nid = s.duplicateDrawing(selDrawing)
        return nid && selectDrawing(nid)
      }
      if (mod || e.altKey) return

      if (s.playback.open) {
        const phs = s.strategy.phases
        const idx = phs.findIndex((p) => p.id === s.playback.phaseId)
        const transport = {
          ' ': () =>
            s.setPlayback(
              s.playback.playing
                ? { playing: false }
                : { playing: true, t: s.playback.t >= totalDuration(phs) ? 0 : s.playback.t }
            ),
          arrowright: () =>
            s.selectPhase(phs[idx < 0 ? 0 : Math.min(phs.length - 1, idx + 1)]?.id ?? null),
          arrowleft: () => s.selectPhase(idx <= 0 ? null : phs[idx - 1].id),
          home: () => s.selectPhase(null)
        }[k]
        if (transport) {
          e.preventDefault()
          return transport()
        }
      }
      if (k === 'escape') {
        setTool('select')
        clearSelection()
        setMarkerPalette(false)
        setShapePalette(false)
        setShortcutsOpen(false)
        setClearMenu(false)
        return
      }
      if (k === 'delete' || k === 'backspace') {
        // Editing a phase -> Delete hides from *this* phase (non-destructive);
        // otherwise it removes the entity from the whole document.
        const ep = s.playback.open && s.playback.phaseId
        if (selMarker) {
          e.preventDefault()
          if (ep) s.togglePhaseHidden(ep, 'markers', selMarker)
          else s.removeMarker(selMarker)
        } else if (selDrawing) {
          e.preventDefault()
          if (ep) s.togglePhaseHidden(ep, 'drawings', selDrawing)
          else s.removeDrawing(selDrawing)
        }
        return clearSelection()
      }
      if (k === '[' || k === ']') {
        if (!selDrawing) return
        e.preventDefault()
        return s.moveDrawing(selDrawing, k === '[' ? -1 : 1)
      }
      if (!editLayout && TOOL_KEYS[k]) setTool(TOOL_KEYS[k][0])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMarker, selDrawing, editLayout])

  function onPointerDown(e) {
    const onEmpty = e.target === e.target.getStage()
    if (editLayout) return onEmpty && setSelectedFixture(null)
    if (tool === 'select') return onEmpty && clearSelection()
    draw.begin()
  }

  function onDrop(e) {
    e.preventDefault()
    const squadId = e.dataTransfer.getData('application/x-gw-squad')
    if (squadId) act().setSquadToken(squadId, clampToMap(cam.clientToMap(e.clientX, e.clientY)))
  }

  function toggleEditLayout() {
    setEditLayout((v) => !v)
    setSelectedFixture(null)
    setTool('select')
    draw.cancel()
    if (pb.open) act().setPlayback(PB_CLOSED)
  }

  function togglePhases() {
    if (pb.open) return act().setPlayback(PB_CLOSED)
    setEditLayout(false)
    setTool('select')
    clearSelection()
    act().setPlayback({ ...PB_CLOSED, open: true })
  }

  const stageClass = editLayout
    ? ''
    : tool === 'erase'
      ? ' erasing'
      : tool !== 'select'
        ? ' drawing'
        : ''

  return (
    <div className="map">
      {toolbarSlot &&
        createPortal(
          <CanvasToolbar
            editLayout={editLayout}
            tool={tool}
            setTool={setTool}
            isShapeTool={SHAPE_TOOLS.includes(tool)}
            shapePalette={shapePalette}
            setShapePalette={setShapePalette}
            markerPalette={markerPalette}
            setMarkerPalette={setMarkerPalette}
            clearMenu={clearMenu}
            setClearMenu={setClearMenu}
            shortcutsOpen={shortcutsOpen}
            setShortcutsOpen={setShortcutsOpen}
            phasesOpen={pb.open}
            boardCount={placedSquads.length}
            markerCount={markers.length}
            drawingCount={drawings.length}
            drawColor={drawColor}
            setDrawColor={setDrawColor}
            drawWidth={drawWidth}
            setDrawWidth={setDrawWidth}
            zoomPct={Math.round(view.zoom * 100)}
            addMarker={act().addMarker}
            addNote={act().addNote}
            addTimer={act().addTimer}
            centerLogical={cam.centerMap}
            togglePhases={togglePhases}
            toggleEditLayout={toggleEditLayout}
            clearTokens={act().clearTokens}
            clearMarkers={act().clearMarkers}
            clearDrawings={act().clearDrawings}
            zoomBy={cam.zoomBy}
            zoomTo={cam.zoomTo}
            fit={cam.fit}
            onExportPng={() =>
              downloadBoardImage(stageRef.current, stratName, { width: MAP_W, height: MAP_H })
            }
          />,
          toolbarSlot
        )}

      <div
        className={'stage-wrap' + (pb.open ? ' phases-open' : '') + stageClass}
        ref={wrapRef}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {cam.size.w > 0 && cam.size.h > 0 && (
          <Stage
            ref={stageRef}
            width={cam.size.w}
            height={cam.size.h}
            scaleX={view.zoom}
            scaleY={view.zoom}
            x={view.x}
            y={view.y}
            draggable={tool === 'select' && !pb.playing}
            onWheel={cam.onWheel}
            onDragEnd={cam.onStageDragEnd}
            onPointerDown={onPointerDown}
            onPointerMove={draw.move}
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
              {draw.draft && <DrawingShape drawing={{ ...draw.draft, id: 'draft' }} live />}
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

            <Layer listening={interactive} opacity={editLayout ? 0.35 : 1}>
              {placedSquads.map((q) =>
                frame?.hiddenSquads?.has(q.id) ? null : (
                  <SquadToken
                    key={q.id}
                    squad={q}
                    override={frame?.squads[q.id]}
                    editingPhase={editingPhase}
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
                    editingPhase={editingPhase}
                    locked={pb.playing}
                  />
                )
              )}
            </Layer>
          </Stage>
        )}

        {!editLayout && <AnnotationsOverlay view={view} hiddenNotes={frame?.hiddenNotes} />}

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

        {pb.open && <PhasesBar stageRef={stageRef} />}
      </div>
    </div>
  )
}
