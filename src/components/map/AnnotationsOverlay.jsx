import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { NOTE_COLORS, fmtClock } from '../../lib/tacticalDefs.js'

// Notes and timers are HTML (crisp text, native editing). They stick to a map
// point but keep a constant on-screen size; we just reposition them as the
// Konva view pans/zooms.
function toScreen(item, view) {
  return { left: item.x * view.zoom + view.x, top: item.y * view.zoom + view.y }
}

function useDrag(item, view, commitPos) {
  const [live, setLive] = useState(null)
  const start = useRef(null)

  const onPointerDown = (e) => {
    if (e.button === 1 || e.button === 2) return
    e.preventDefault()
    start.current = { cx: e.clientX, cy: e.clientY, x: item.x, y: item.y }
    const onMove = (ev) => {
      const s = start.current
      if (!s) return
      setLive({
        x: s.x + (ev.clientX - s.cx) / view.zoom,
        y: s.y + (ev.clientY - s.cy) / view.zoom
      })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      start.current = null
      setLive((cur) => {
        if (cur) commitPos({ x: Math.round(cur.x), y: Math.round(cur.y) })
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { pos: live ?? item, onPointerDown }
}

const NOTE_W_DEFAULT = 178
const NOTE_MIN_W = 130
// keep in step with .ann-bar's height + textarea's min-height in the CSS so
// the drag floor and the CSS floor agree
const NOTE_MIN_H = 92

// Drag the corner grip to resize a note. Size is in screen px (notes keep a
// constant on-screen size regardless of map zoom), so no zoom scaling needed.
function useResize(note, commitSize) {
  const [live, setLive] = useState(null)
  const start = useRef(null)

  const onPointerDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    start.current = {
      cx: e.clientX,
      cy: e.clientY,
      w: note.width ?? NOTE_W_DEFAULT,
      h: note.height ?? e.currentTarget.closest('.note')?.offsetHeight ?? 90
    }
    const onMove = (ev) => {
      const s = start.current
      if (!s) return
      setLive({
        width: Math.max(NOTE_MIN_W, s.w + (ev.clientX - s.cx)),
        height: Math.max(NOTE_MIN_H, s.h + (ev.clientY - s.cy))
      })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      start.current = null
      setLive((cur) => {
        if (cur) commitSize({ width: Math.round(cur.width), height: Math.round(cur.height) })
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { size: live, onPointerDown }
}

function NoteCard({ note, view }) {
  const updateNote = useStore((s) => s.updateNote)
  const removeNote = useStore((s) => s.removeNote)
  const { pos, onPointerDown } = useDrag(note, view, (p) => updateNote(note.id, p))
  const { size, onPointerDown: onResizeDown } = useResize(note, (s) => updateNote(note.id, s))
  const [text, setText] = useState(note.text)
  useEffect(() => setText(note.text), [note.text])

  const { left, top } = toScreen(pos, view)
  const width = size?.width ?? note.width ?? NOTE_W_DEFAULT
  const height = size?.height ?? note.height

  return (
    <div className="ann note" style={{ left, top, width, height, background: note.color }}>
      <div className="ann-bar" onPointerDown={onPointerDown}>
        <span className="ann-grip">⠿</span>
        <span className="note-colors">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              className="swatch"
              style={{ background: c }}
              onClick={() => updateNote(note.id, { color: c })}
              title="Note colour"
            />
          ))}
        </span>
        <button className="ann-x" onClick={() => removeNote(note.id)} title="Delete note">
          ✕
        </button>
      </div>
      <textarea
        value={text}
        placeholder="Note…"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== note.text && updateNote(note.id, { text })}
      />
      <div className="ann-resize" onPointerDown={onResizeDown} title="Drag to resize" />
    </div>
  )
}

function TimerCard({ timer, view }) {
  const updateTimer = useStore((s) => s.updateTimer)
  const removeTimer = useStore((s) => s.removeTimer)
  const { pos, onPointerDown } = useDrag(timer, view, (p) => updateTimer(timer.id, p))

  const [remaining, setRemaining] = useState(timer.seconds)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running) setRemaining(timer.seconds)
  }, [timer.seconds, running])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const { left, top } = toScreen(pos, view)
  const done = remaining === 0

  return (
    <div className={'ann timer' + (done ? ' done' : '')} style={{ left, top }}>
      <div className="ann-bar" onPointerDown={onPointerDown}>
        <span className="ann-grip">⠿</span>
        <button className="ann-x" onClick={() => removeTimer(timer.id)} title="Delete timer">
          ✕
        </button>
      </div>
      <div className="timer-clock">{fmtClock(remaining)}</div>
      <div className="timer-controls">
        <button onClick={() => setRunning((v) => !v)}>{running ? '❚❚' : '▶'}</button>
        <button
          onClick={() => {
            setRunning(false)
            setRemaining(timer.seconds)
          }}
          title="Reset"
        >
          ⟲
        </button>
        <button
          onClick={() => updateTimer(timer.id, { seconds: Math.max(5, timer.seconds - 10) })}
          title="-10s"
        >
          −
        </button>
        <button
          onClick={() => updateTimer(timer.id, { seconds: timer.seconds + 10 })}
          title="+10s"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function AnnotationsOverlay({ view, hiddenNotes }) {
  const notes = useStore((s) => s.strategy.notes)
  const timers = useStore((s) => s.strategy.timers)

  return (
    <div className="annotations-overlay">
      {notes.map((n) =>
        hiddenNotes?.has(n.id) ? null : <NoteCard key={n.id} note={n} view={view} />
      )}
      {timers.map((t) => (
        <TimerCard key={t.id} timer={t} view={view} />
      ))}
    </div>
  )
}
