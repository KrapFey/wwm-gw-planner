import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Stage, Layer, Group, Circle, Line as KLine } from 'react-konva'
import { useStore } from '../../store/useStore.js'
import { MAP_W, MAP_H, clampToMap } from '../../lib/mapLayout.js'
import {
  DRAW_COLORS,
  DRAW_WIDTHS,
  SHAPE_TOOLS,
  NOTE_COLORS,
  drawingPolyline
} from '../../lib/tacticalDefs.js'
import MapImage from './MapImage.jsx'
import FixtureSprite from './FixtureSprite.jsx'
import SquadToken from './SquadToken.jsx'
import Marker from './Marker.jsx'
import MarkerInspector from './MarkerInspector.jsx'
import DrawingShape from './DrawingShape.jsx'
import { NoteItem, TimerItem, NoteEditor } from './NoteTimer.jsx'
import LayoutEditorPanel from './LayoutEditorPanel.jsx'
import PhasesBar from './PhasesBar.jsx'
import CanvasToolbar, { TOOL_KEYS } from './CanvasToolbar.jsx'
import { useCamera } from './useCamera.js'
import { useDrawTool } from './useDrawTool.js'
import { startFrame, frameAt, totalDuration, phaseArrivalTime } from '../../lib/playback.js'
import { downloadBoardImage } from '../../lib/strategyFile.js'

const PB_CLOSED = { open: false, playing: false, phaseId: null, t: 0 }
const NEW_ITEM = {
  note: { text: '', color: NOTE_COLORS[0] },
  timer: { seconds: 60 }
}

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
  const [menu, setMenu] = useState(null) // open toolbar dropdown
  const [sel, setSel] = useState(null) // selected item id
  const [editId, setEditId] = useState(null) // note whose text is being edited
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

  const setTool = (t) => {
    setToolRaw(t)
    if (t !== 'select') {
      setMenu(null)
      setSel(null)
    }
  }
  const select = useCallback((id) => setSel(id), [])
  const stopEditing = useCallback(() => setEditId(null), [])

  const squads = useStore((s) => s.strategy.squads)
  const items = useStore((s) => s.strategy.items)
  const phases = useStore((s) => s.strategy.phases)
  const fixtures = useStore((s) => s.layout.fixtures)
  const stratName = useStore((s) => s.strategy.meta.name)
  const view = useStore((s) => s.view)
  const pb = useStore((s) => s.playback)
  const showTrail = useStore((s) => s.ui.showTrail)
  const act = useStore.getState // store actions are stable; read at call time

  const byType = useMemo(() => {
    const m = { pill: [], marker: [], drawing: [], note: [], timer: [] }
    for (const it of items) m[it.type]?.push(it)
    return m
  }, [items])
  const squadById = useMemo(() => Object.fromEntries(squads.map((q) => [q.id, q])), [squads])
  const interactive = tool === 'select' && !editLayout && !pb.playing

  // Resolve each phase's assigned drawn paths into polylines the pills follow.
  const pathPolys = useMemo(() => {
    if (!pb.open || !phases.length) return null
    const byId = Object.fromEntries(byType.drawing.map((d) => [d.id, d]))
    const res = {}
    for (const p of phases) {
      const m = {}
      for (const [pill, did] of Object.entries(p.paths)) {
        const poly = drawingPolyline(byId[did])
        if (poly) m[pill] = poly
      }
      if (Object.keys(m).length) res[p.id] = m
    }
    return Object.keys(res).length ? res : null
  }, [pb.open, phases, byType.drawing])

  // Phase-animation frame: the interpolated board while the phase editor is
  // open (null otherwise).
  const sf = useMemo(
    () => (pb.open && phases.length ? startFrame(items) : null),
    [pb.open, phases, items]
  )
  const frame = useMemo(
    () => (sf ? frameAt(sf, phases, pb.t, pathPolys) : null),
    [sf, phases, pb.t, pathPolys]
  )
  const shown = (it) => !frame?.hidden.has(it.id)
  const at = (it) => frame?.pos[it.id] ?? it
  const scrubbing = frame && (pb.playing || pb.t > 0)
  // motion trail: each pill's position at the start of the phase now animating
  // (previous keyframe, or the live Start frame) -> a dashed line to where it is.
  const trailFrom = useMemo(() => {
    if (!scrubbing || !showTrail) return null
    return frame.phaseIndex > 0
      ? frameAt(sf, phases, phaseArrivalTime(phases, frame.phaseIndex - 1), pathPolys).pos
      : sf.pos
  }, [scrubbing, showTrail, sf, phases, pathPolys, frame?.phaseIndex])

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
        if (!sel) return
        e.preventDefault()
        const nid = s.duplicateItem(sel)
        return nid && setSel(nid)
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
        setSel(null)
        return setMenu(null)
      }
      if (k === 'delete' || k === 'backspace') {
        if (!sel) return
        e.preventDefault()
        s.removeFromBoard(sel)
        return setSel(null)
      }
      if (k === '[' || k === ']') {
        if (!sel) return
        e.preventDefault()
        return s.moveItem(sel, k === '[' ? -1 : 1)
      }
      if (!editLayout && TOOL_KEYS[k]) setTool(TOOL_KEYS[k][0])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, editLayout])

  function onPointerDown(e) {
    const onEmpty = e.target === e.target.getStage()
    if (editLayout) return onEmpty && setSelectedFixture(null)
    if (tool === 'select') return onEmpty && setSel(null)
    draw.begin()
  }

  function onDrop(e) {
    e.preventDefault()
    const squadId = e.dataTransfer.getData('application/x-gw-squad')
    if (squadId) act().placePill(squadId, clampToMap(cam.clientToMap(e.clientX, e.clientY)))
  }

  // toolbar "add": a marker / note / timer at the centre of the view
  function addAt(type, extra) {
    const id = act().addItem({ type, ...cam.centerMap(), ...NEW_ITEM[type], ...extra })
    setSel(id)
    if (type === 'note') setEditId(id)
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
    setSel(null)
    act().setPlayback({ ...PB_CLOSED, open: true })
  }

  const stageClass = editLayout
    ? ''
    : tool === 'erase'
      ? ' erasing'
      : tool !== 'select'
        ? ' drawing'
        : ''
  const selItem = sel && items.find((i) => i.id === sel)
  const editNote = editId && byType.note.find((n) => n.id === editId)
  const cardProps = (it) => ({
    ...at(it),
    zoom: view.zoom,
    selected: interactive && it.id === sel,
    onSelect: select,
    locked: pb.playing
  })

  return (
    <div className="map">
      {toolbarSlot &&
        createPortal(
          <CanvasToolbar
            editLayout={editLayout}
            tool={tool}
            setTool={setTool}
            isShapeTool={SHAPE_TOOLS.includes(tool)}
            menu={menu}
            setMenu={setMenu}
            phasesOpen={pb.open}
            counts={{
              pill: byType.pill.length,
              marker: byType.marker.length,
              drawing: byType.drawing.length
            }}
            drawColor={drawColor}
            setDrawColor={setDrawColor}
            drawWidth={drawWidth}
            setDrawWidth={setDrawWidth}
            zoomPct={Math.round(view.zoom * 100)}
            onAdd={addAt}
            onClear={act().clearItems}
            togglePhases={togglePhases}
            toggleEditLayout={toggleEditLayout}
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
            {/* 3 layers (Konva recommends <= 5): base map + fixtures, drawings,
                and the pieces (trail, pills, markers, notes / timers) */}
            <Layer>
              <Group listening={false}>
                <MapImage />
              </Group>
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
              {byType.drawing.filter(shown).map((d) => (
                <DrawingShape
                  key={d.id}
                  drawing={d}
                  selected={interactive && d.id === sel}
                  onSelect={select}
                />
              ))}
              {draw.draft && <DrawingShape drawing={{ ...draw.draft, id: 'draft' }} live />}
            </Layer>

            <Layer listening={interactive}>
              {trailFrom && (
                <Group listening={false}>
                  {byType.pill.filter(shown).map((p) => {
                    const cur = frame.pos[p.id]
                    const from = trailFrom[p.id]
                    const color = squadById[p.id]?.color
                    if (!cur || !from || Math.hypot(cur.x - from.x, cur.y - from.y) < 4) return null
                    return (
                      <Group key={p.id}>
                        <KLine
                          points={[from.x, from.y, cur.x, cur.y]}
                          stroke={color}
                          strokeWidth={4}
                          opacity={0.9}
                          lineCap="round"
                          dash={[10, 7]}
                          shadowColor={color}
                          shadowBlur={6}
                          shadowOpacity={0.5}
                        />
                        <Circle
                          x={from.x}
                          y={from.y}
                          radius={11}
                          fill={color}
                          opacity={0.45}
                          stroke="#0c0e12"
                          strokeWidth={1.5}
                        />
                      </Group>
                    )
                  })}
                </Group>
              )}

              <Group opacity={editLayout ? 0.35 : 1}>
                {byType.pill.filter(shown).map((p) =>
                  squadById[p.id] ? (
                    <SquadToken
                      key={p.id}
                      squad={squadById[p.id]}
                      {...at(p)}
                      selected={interactive && p.id === sel}
                      onSelect={select}
                      locked={pb.playing}
                    />
                  ) : null
                )}
              </Group>

              {/* markers sit above team pills so a fresh/moved marker is never
                  hidden under one; notes + timers above everything */}
              {byType.marker.filter(shown).map((m) => (
                <Marker
                  key={m.id}
                  marker={m}
                  {...at(m)}
                  selected={m.id === sel}
                  onSelect={select}
                  locked={pb.playing}
                />
              ))}

              {!editLayout && (
                <>
                  {byType.note.filter(shown).map((n) => (
                    <NoteItem
                      {...cardProps(n)}
                      key={n.id}
                      note={n}
                      editing={n.id === editId}
                      onEdit={setEditId}
                    />
                  ))}
                  {byType.timer.filter(shown).map((t) => (
                    <TimerItem {...cardProps(t)} key={t.id} timer={t} />
                  ))}
                </>
              )}
            </Layer>
          </Stage>
        )}

        {editNote && <NoteEditor stageRef={stageRef} note={editNote} onDone={stopEditing} />}

        {!editLayout && selItem?.type === 'marker' && (
          <MarkerInspector marker={selItem} onClose={() => setSel(null)} />
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
