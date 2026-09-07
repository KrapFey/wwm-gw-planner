import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { totalDuration, activePhaseIndex } from '../../lib/playback.js'
import { IconPlay, IconPause, IconSkipBack, IconSkipFwd, IconX } from '../Icons.jsx'

const secs = (ms) => (ms / 1000).toFixed(1)

export default function PhasesBar() {
  const phases = useStore((s) => s.strategy.phases)
  const drawings = useStore((s) => s.strategy.drawings)
  const notes = useStore((s) => s.strategy.notes)
  const pb = useStore((s) => s.playback)
  const setPlayback = useStore((s) => s.setPlayback)
  const selectPhase = useStore((s) => s.selectPhase)
  const addPhase = useStore((s) => s.addPhase)
  const removePhase = useStore((s) => s.removePhase)
  const renamePhase = useStore((s) => s.renamePhase)
  const movePhase = useStore((s) => s.movePhase)
  const setPhaseTiming = useStore((s) => s.setPhaseTiming)
  const togglePhaseHidden = useStore((s) => s.togglePhaseHidden)

  const [visOpen, setVisOpen] = useState(false)
  const visRef = useRef(null)
  useEffect(() => {
    if (!visOpen) return
    const onDoc = (e) => {
      if (!visRef.current?.contains(e.target)) setVisOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [visOpen])

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
            className={'dock-btn' + (pb.playing ? ' on' : '')}
            title={pb.playing ? 'Pause' : 'Play'}
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

        <span className="sep" />

        <div className="pb-chips">
          <button
            className={'pb-chip' + (chipActive(-1) ? ' on' : '')}
            onClick={() => selectPhase(null)}
          >
            Start
          </button>
          {phases.map((p, i) => (
            <button
              key={p.id}
              className={'pb-chip' + (chipActive(i) ? ' on' : '')}
              onClick={() => selectPhase(p.id)}
              onDoubleClick={() => {
                const n = prompt('Rename phase', p.name)
                if (n && n.trim()) renamePhase(p.id, n.trim())
              }}
              title="click to edit · double-click to rename"
            >
              {p.name}
            </button>
          ))}
          <button
            className="pb-chip add"
            title="Add a phase after the current one, seeded from it"
            onClick={() =>
              addPhase(pb.phaseId ?? phases[phases.length - 1]?.id ?? null)
            }
          >
            + Phase
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
              onClick={() => setPlayback({ loop: !pb.loop })}
            >
              ⟳
            </button>
          </>
        )}

        <button
          className="dock-btn"
          title="Close phase editor"
          onClick={() => setPlayback({ open: false, playing: false, phaseId: null, t: 0 })}
        >
          <IconX />
        </button>
      </div>

      {selPhase && (
        <div className="pb-row pb-timing">
          <span className="muted">{selPhase.name}</span>
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

          {(drawings.length > 0 || notes.length > 0) && (
            <div className="pb-vis" ref={visRef}>
              <button className="tiny ghost" onClick={() => setVisOpen((v) => !v)}>
                Visible ▾
              </button>
              {visOpen && (
                <div className="pb-vis-pop">
                  <div className="muted" style={{ fontSize: 10, padding: '2px 4px' }}>
                    shown in {selPhase.name}
                  </div>
                  {drawings.map((d, i) => {
                    const hidden = selPhase.board.hiddenDrawings?.includes(d.id)
                    return (
                      <label key={d.id}>
                        <input
                          type="checkbox"
                          checked={!hidden}
                          onChange={() => togglePhaseHidden(selPhase.id, 'drawings', d.id)}
                        />
                        <span className="mk-dot" style={{ background: d.color }} />
                        {d.tool === 'arrow' ? 'Arrow' : 'Line'} {i + 1}
                      </label>
                    )
                  })}
                  {notes.map((n, i) => {
                    const hidden = selPhase.board.hiddenNotes?.includes(n.id)
                    return (
                      <label key={n.id}>
                        <input
                          type="checkbox"
                          checked={!hidden}
                          onChange={() => togglePhaseHidden(selPhase.id, 'notes', n.id)}
                        />
                        Note {i + 1}
                        {n.text ? ` — ${n.text.slice(0, 16)}` : ''}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <span className="spacer" />
          <button className="tiny ghost" onClick={() => movePhase(selPhase.id, -1)}>
            ‹ move
          </button>
          <button className="tiny ghost" onClick={() => movePhase(selPhase.id, 1)}>
            move ›
          </button>
          <button
            className="tiny ghost"
            onClick={() => {
              if (confirm(`Delete ${selPhase.name}?`)) removePhase(selPhase.id)
            }}
          >
            Delete phase
          </button>
        </div>
      )}
    </div>
  )
}
