import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import {
  totalDuration,
  activePhaseIndex,
  EASING_KINDS,
  EASING_LABEL
} from '../../lib/playback.js'
import { MARKER_KINDS, DRAW_TOOL_LABEL, PATH_TOOLS } from '../../lib/tacticalDefs.js'
import { squadLabel } from '../../lib/selectors.js'
import { downloadAnimation } from '../../lib/strategyFile.js'
import { recordBoardVideo, videoRecordingSupported } from '../../lib/recordBoard.js'
import { toast, toastError, withUndo } from '../../lib/toast.js'
import {
  IconPlay,
  IconPause,
  IconSkipBack,
  IconSkipFwd,
  IconFilm,
  IconTrail,
  IconX,
  IconLoop,
  IconPlus,
  IconChevronDown
} from '../Icons.jsx'

const secs = (ms) => (ms / 1000).toFixed(1)

// Advances playback.t while playing (runs while the phases bar is open).
function usePlaybackClock(playing, phases) {
  const setPlayback = useStore((s) => s.setPlayback)
  useEffect(() => {
    if (!playing) return
    const total = totalDuration(phases)
    let raf
    let last = performance.now()
    const tick = (now) => {
      const pb = useStore.getState().playback
      if (!pb.playing) return
      const next = pb.t + (now - last) * (pb.speed || 1)
      last = now
      if (next >= total) {
        if (!pb.loop) return setPlayback({ t: total, playing: false })
        setPlayback({ t: 0 })
      } else {
        setPlayback({ t: next })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, phases, setPlayback])
}

// Play the phase animation once from Start and record the board to a video.
async function exportAnimation(stage, phases, name) {
  const { setPlayback } = useStore.getState()
  const total = totalDuration(phases)
  if (!total || !stage) return
  if (!videoRecordingSupported())
    return toastError('This browser can’t record video. Try Chrome or Edge.')
  const restore = { ...useStore.getState().playback }
  try {
    setPlayback({ open: true, phaseId: null, playing: false, t: 0 })
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    const blob = await recordBoardVideo(stage, () =>
      new Promise((resolve) => {
        const started = performance.now()
        setPlayback({ playing: true, t: 0 })
        const check = () => {
          if (performance.now() - started < total + 250) return requestAnimationFrame(check)
          setPlayback({ playing: false })
          resolve()
        }
        requestAnimationFrame(check)
      })
    )
    downloadAnimation(blob, name)
    toast('Animation saved as a video')
  } catch (err) {
    toastError(`Recording failed: ${err.message || 'unknown error'}`)
  } finally {
    setPlayback(restore)
  }
}

// One labelled row per map item for the Visible / Paths menus.
const TYPE_LABEL = { note: 'Note', timer: 'Timer' }
function itemRows(strategy, items) {
  const n = {}
  return items.map((item) => {
    n[item.type] = (n[item.type] || 0) + 1
    if (item.type === 'pill') {
      const q = strategy.squads.find((x) => x.id === item.id)
      return { item, label: q ? squadLabel(strategy, q) : 'Team', dot: q?.color }
    }
    if (item.type === 'marker') {
      const meta = MARKER_KINDS[item.kind] || {}
      return { item, label: item.label || meta.label || 'Marker', dot: meta.color }
    }
    if (item.type === 'drawing') {
      return { item, label: `${DRAW_TOOL_LABEL[item.tool] ?? 'Line'} ${n.drawing}`, dot: item.color }
    }
    const text = item.text ? ` — ${item.text.slice(0, 16)}` : ''
    return { item, label: `${TYPE_LABEL[item.type]} ${n[item.type]}${text}`, dot: item.color }
  })
}

export default function PhasesBar({ stageRef }) {
  const strategy = useStore((s) => s.strategy)
  const showTrail = useStore((s) => s.ui.showTrail)
  const onToggleTrail = useStore((s) => s.toggleShowTrail)
  const [recording, setRecording] = useState(false)
  const onExportVideo = async () => {
    setRecording(true)
    await exportAnimation(stageRef.current, phases, strategy.meta.name)
    setRecording(false)
  }
  const phases = useStore((s) => s.strategy.phases)
  const items = useStore((s) => s.strategy.items)
  const pb = useStore((s) => s.playback)
  const setPlayback = useStore((s) => s.setPlayback)
  const selectPhase = useStore((s) => s.selectPhase)
  const addPhase = useStore((s) => s.addPhase)
  const removePhase = useStore((s) => s.removePhase)
  const renamePhase = useStore((s) => s.renamePhase)
  const movePhase = useStore((s) => s.movePhase)
  const movePhaseTo = useStore((s) => s.movePhaseTo)
  const setPhaseTiming = useStore((s) => s.setPhaseTiming)
  const setPhasePath = useStore((s) => s.setPhasePath)
  const togglePhaseHidden = useStore((s) => s.togglePhaseHidden)
  usePlaybackClock(pb.playing, phases)

  const [renaming, setRenaming] = useState(null) // phase id being renamed in place
  const [visOpen, setVisOpen] = useState(false)
  const [pathsOpen, setPathsOpen] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [dropIdx, setDropIdx] = useState(null)
  const visRef = useRef(null)
  const pathsRef = useRef(null)
  useEffect(() => {
    if (!visOpen && !pathsOpen) return
    const onDoc = (e) => {
      if (visOpen && !visRef.current?.contains(e.target)) setVisOpen(false)
      if (pathsOpen && !pathsRef.current?.contains(e.target)) setPathsOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [visOpen, pathsOpen])

  const rows = itemRows(strategy, items)
  const pills = rows.filter((r) => r.item.type === 'pill')
  const pathChoices = rows.filter((r) => PATH_TOOLS.includes(r.item.tool))

  const total = totalDuration(phases)
  const hasPhases = phases.length > 0

  const scrubbed = pb.playing || pb.t > 0
  const activeIdx = scrubbed ? activePhaseIndex(phases, pb.t) : -2
  const chipActive = (i) =>
    scrubbed ? i === activeIdx : i === -1 ? !pb.phaseId : phases[i]?.id === pb.phaseId

  const play = () => {
    if (!hasPhases) return
    setPlayback({ playing: true, t: pb.t >= total ? 0 : pb.t })
  }

  const selPhase = pb.phaseId ? phases.find((p) => p.id === pb.phaseId) : null
  const selIndex = phases.findIndex((p) => p.id === pb.phaseId)

  return (
    <div className="phases-bar">
      <div className="pb-row">
        <div className="pb-transport">
          <button
            className="dock-btn"
            title="Previous phase"
            disabled={!hasPhases}
            onClick={() => selectPhase(selIndex <= 0 ? null : phases[selIndex - 1].id)}
          >
            <IconSkipBack />
          </button>
          <button
            className={'dock-btn pb-play' + (pb.playing ? ' on' : '')}
            title={pb.playing ? 'Pause (Space)' : 'Play (Space)'}
            disabled={!hasPhases}
            onClick={() => (pb.playing ? setPlayback({ playing: false }) : play())}
          >
            {pb.playing ? <IconPause /> : <IconPlay />}
          </button>
          <button
            className="dock-btn"
            title="Next phase"
            disabled={!hasPhases}
            onClick={() =>
              selectPhase(
                selIndex < 0
                  ? phases[0]?.id
                  : phases[Math.min(phases.length - 1, selIndex + 1)]?.id
              )
            }
          >
            <IconSkipFwd />
          </button>
        </div>

        <div
          className="pb-chips"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragId && dropIdx != null) movePhaseTo(dragId, dropIdx)
            setDragId(null)
            setDropIdx(null)
          }}
        >
          <button
            className={'pb-chip' + (chipActive(-1) ? ' on' : '')}
            onClick={() => selectPhase(null)}
            onDragOver={(e) => {
              if (dragId) {
                e.preventDefault()
                setDropIdx(0)
              }
            }}
          >
            Start
          </button>
          {phases.map((p, i) =>
            renaming === p.id ? (
              <input
                key={p.id}
                className="pb-chip pb-rename"
                defaultValue={p.name}
                autoFocus
                onFocus={(e) => e.target.select()}
                onBlur={(e) => {
                  const n = e.target.value.trim()
                  if (n && n !== p.name) renamePhase(p.id, n)
                  setRenaming(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') e.currentTarget.value = p.name
                  if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
                }}
                aria-label="Phase name"
              />
            ) : (
              <button
                key={p.id}
                className={
                  'pb-chip' +
                  (chipActive(i) ? ' on' : '') +
                  (dropIdx === i && dragId && dragId !== p.id ? ' drop' : '')
                }
                draggable
                onDragStart={(e) => {
                  setDragId(p.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setDropIdx(null)
                }}
                onDragOver={(e) => {
                  if (dragId) {
                    e.preventDefault()
                    setDropIdx(i)
                  }
                }}
                onClick={() => selectPhase(p.id)}
                onDoubleClick={() => setRenaming(p.id)}
                title="Click to edit, double-click to rename, drag to reorder"
              >
                {p.name}
              </button>
            )
          )}
          <button
            className="pb-chip add"
            title="Add a phase after the current one, seeded from it"
            onClick={() =>
              addPhase(pb.phaseId ?? phases[phases.length - 1]?.id ?? null)
            }
          >
            <IconPlus /> Phase
          </button>
        </div>

        <span className="spacer" />

        {hasPhases && (
          <>
            <input
              className="pb-scrub"
              type="range"
              min="0"
              max={total}
              step="10"
              value={Math.min(pb.t, total)}
              style={{ '--p': total ? Math.min(pb.t, total) / total : 0 }}
              onChange={(e) => setPlayback({ playing: false, t: Number(e.target.value) })}
            />
            <span className="pb-time">
              {secs(Math.min(pb.t, total))} / {secs(total)}s
            </span>
            <select
              className="pb-speed"
              value={pb.speed}
              onChange={(e) => setPlayback({ speed: Number(e.target.value) })}
              title="Playback speed"
            >
              {[0.5, 1, 2].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
            <button
              className={'dock-btn' + (pb.loop ? ' on' : '')}
              title="Loop"
              aria-pressed={pb.loop}
              onClick={() => setPlayback({ loop: !pb.loop })}
            >
              <IconLoop />
            </button>
            <button
              className={'dock-btn' + (showTrail ? ' on' : '')}
              title={showTrail ? 'Hide motion trail' : 'Show motion trail'}
              onClick={onToggleTrail}
            >
              <IconTrail />
            </button>
          </>
        )}

        {hasPhases && onExportVideo && (
          <button
            className={'dock-btn' + (recording ? ' on' : '')}
            title={recording ? 'Recording…' : 'Export animation as a video'}
            disabled={recording || pb.playing}
            onClick={onExportVideo}
          >
            <IconFilm />
          </button>
        )}

        <button
          className="dock-btn"
          title="Close phase editor"
          disabled={recording}
          onClick={() => setPlayback({ open: false, playing: false, phaseId: null, t: 0 })}
        >
          <IconX />
        </button>
      </div>

      {selPhase && (
        <div className="pb-row pb-timing">
          <strong className="pb-phase-name">{selPhase.name}</strong>
          <label>
            transition
            <input
              type="number"
              min="0"
              step="0.1"
              value={secs(selPhase.duration)}
              onChange={(e) =>
                setPhaseTiming(selPhase.id, { duration: (Number(e.target.value) || 0) * 1000 })
              }
            />
            s
          </label>
          <label>
            hold
            <input
              type="number"
              min="0"
              step="0.1"
              value={secs(selPhase.hold)}
              onChange={(e) =>
                setPhaseTiming(selPhase.id, { hold: (Number(e.target.value) || 0) * 1000 })
              }
            />
            s
          </label>
          <label>
            ease
            <select
              value={selPhase.easing || 'inout'}
              onChange={(e) => setPhaseTiming(selPhase.id, { easing: e.target.value })}
            >
              {EASING_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EASING_LABEL[k]}
                </option>
              ))}
            </select>
          </label>

          {pills.length > 0 && (
            <div className="pb-vis" ref={pathsRef}>
              <button
                className={
                  'tiny' +
                  (Object.keys(selPhase.paths || {}).length ? ' primary' : ' ghost')
                }
                onClick={() => setPathsOpen((v) => !v)}
              >
                Paths <IconChevronDown />
              </button>
              {pathsOpen && (
                <div className="pb-vis-pop">
                  {pathChoices.length === 0 ? (
                    <div className="muted" style={{ fontSize: 11, padding: '4px 6px', maxWidth: 200 }}>
                      Draw a line or arrow on the map, then pick it here to send a
                      team along it this phase.
                    </div>
                  ) : (
                    <>
                      <div className="muted" style={{ fontSize: 10, padding: '2px 4px' }}>
                        a team walks its drawn path this phase
                      </div>
                      {pills.map(({ item, label, dot }) => (
                        <label key={item.id}>
                          <span className="mk-dot" style={{ background: dot }} />
                          {label}
                          <select
                            style={{ marginLeft: 'auto' }}
                            value={selPhase.paths[item.id] || ''}
                            onChange={(e) =>
                              setPhasePath(selPhase.id, item.id, e.target.value || null)
                            }
                          >
                            <option value="">— straight</option>
                            {pathChoices.map((c) => (
                              <option key={c.item.id} value={c.item.id}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <div className="pb-vis" ref={visRef}>
              <button className="tiny ghost" onClick={() => setVisOpen((v) => !v)}>
                Visible <IconChevronDown />
              </button>
              {visOpen && (
                <div className="pb-vis-pop">
                  <div className="muted" style={{ fontSize: 10, padding: '2px 4px' }}>
                    shown in {selPhase.name}
                  </div>
                  {rows.map(({ item, label, dot }) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={!selPhase.hidden.includes(item.id)}
                        onChange={() => togglePhaseHidden(selPhase.id, item.id)}
                      />
                      {dot && <span className="mk-dot" style={{ background: dot }} />}
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <span className="spacer" />
          <button className="tiny ghost" onClick={() => movePhase(selPhase.id, -1)}>
            Move earlier
          </button>
          <button className="tiny ghost" onClick={() => movePhase(selPhase.id, 1)}>
            Move later
          </button>
          <button
            className="tiny ghost"
            title="Duplicate this phase after it"
            onClick={() => addPhase(selPhase.id)}
          >
            Duplicate
          </button>
          <button
            className="tiny ghost danger"
            onClick={() => {
              withUndo(`Deleted ${selPhase.name}`, () => removePhase(selPhase.id))
            }}
          >
            Delete phase
          </button>
        </div>
      )}
    </div>
  )
}
